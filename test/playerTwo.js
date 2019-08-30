const { BN, fromAscii, toWei } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const wager = new BN(toWei('0.1')); // <-- Change ETH value to be tested here
const depositAmount = new BN(toWei('0.5')); // <-- Change ETH value to be tested here
const withdrawAmount = new BN(toWei('0.2')); // <-- Change ETH value to be tested here
const resultTime = 1200; // <-- Change result time to be tested here
const zero = new BN('0');
const time = 3600; // Around an hour
const invalidTime = 4000;
const oneEtherInWei = new BN(toWei("1"));
const aliceSecretBytes = fromAscii("aliceSecret");
const fakeSecretBytes = fromAscii("secret");
const aliceChoice = new BN("1");
const bobLoseChoice = new BN("3");
const bobWinChoice = new BN("2");
const lowInvalidChoice = new BN("0");
const highInvalidChoice = new BN("4");

function wait(seconds) {
  return new Promise((resolve, reject) => setTimeout(resolve, seconds*1000));
}

contract('RockPaperScissors', (accounts) => {

  let rPSInstance;
  let owner, alice, bob;
  let aliceHash;

  before("Preparing Accounts and Initial Checks", async function() {
    assert.isAtLeast(accounts.length, 3, "Atleast three accounts required");

    // Setup 4 accounts.
    [owner, alice, bob] = accounts;

    //Checking if all accounts have atleast 2 ETH or more for test
    assert.isTrue((new BN(await web3.eth.getBalance(owner))).gt(oneEtherInWei), "Owner Account has less than 1 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(alice))).gt(oneEtherInWei), "Alice Account has less than 1 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(bob))).gt(oneEtherInWei), "Bob Account has less than 1 ETH");

  })

  beforeEach("Creating New Instance", async function() {
    rPSInstance = await rPS.new(time, resultTime, { from: owner});

    // Get the hashValue first
    aliceHash = await rPSInstance.encrypt(aliceChoice, aliceSecretBytes, {from: alice});
  });

  describe("Function: playerTwo", function() {

    describe("Basic Working", function() {

      it('playerTwo should be able to play correctly', async () => {
        // Make transaction from Alice to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});

        // Make transaction from Bob to playerTwo function.
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
    
        // Get details of Bob and Wager from contract
        const contractEndingBalanceOfBob = (await rPSInstance.balances(bob));
        const playDetails = (await rPSInstance.plays(aliceHash));
        const playerTwoChoice = playDetails.playerTwoChoice;
    
        // Check if the result is correct or not
        assert.strictEqual(contractEndingBalanceOfBob.toString(10),(depositAmount.sub(wager)).toString(10), "Contract Balance wasn't correctly credited to Bob");
        assert.strictEqual(playerTwoChoice.toString(10), bobWinChoice.toString(10), "Player 2 Choice is not correctly stored in the Play");
      });
  
    });

    describe("Edge Cases", function() {
        
      it('Should only work if there is enough balance', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: zero}),
          null,
          'SafeMath: subtraction overflow.'
        );
      });
  
      it('Should only work if the choice > 0', async () => {
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, lowInvalidChoice, {from: bob, value: depositAmount}),
          null,
          'Invalid Choice Passed'
        );
      });

      it('Should only work if the choice < 4', async () => {
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, highInvalidChoice, {from: bob, value: depositAmount}),
          null,
          'Invalid Choice Passed'
        );
      });

      it('Should only work if Bob tries to play, if Bob is the one selected by Alice', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: owner, value: depositAmount}),
          null,
          'Only that particular player can play this bet'
        );
      });
  
      it('Should only work if deadline is not expired', async () => {
        await rPSInstance.playerOne(aliceHash, wager, zero, bob, {from: alice, value: depositAmount});
        await wait(1);
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount}),
          null,
          'Play Deadline has passed'
        );
      });
  
    });

    describe("Input Cases", function() {

      it('Should only work if Hash and Choice are given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerTwo({from: bob, value: depositAmount}),
          null,
          'Invalid number of parameters for "playerTwo". Got 1 expected 2!'
        );
      });
    
      it('Should Only work if Hash is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerTwo(bobWinChoice, {from: bob, value: depositAmount}),
          null,
          'invalid bytes32 value'
        );
      });
  
      it('Should Only work if choice is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerTwo(aliceHash, {from: bob, value: depositAmount}),
          null,
          'invalid number value'
        );
      });
    
    });

    describe("Event Cases", function() {
      
      it("Should correctly emit the proper event: Deposit", async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        const receipt = await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});

        assert.strictEqual(receipt.logs.length, 2);
        const log = receipt.logs[0];
    
        assert.strictEqual(log.event, "Deposit");
        assert.strictEqual(log.args.playerAddress, bob);
        assert.strictEqual(log.args.value.toString(10), depositAmount.toString(10));
      });
      
      it("Should correctly emit the proper event: PlayerTwo", async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        const receipt = await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});

        assert.strictEqual(receipt.logs.length, 2);
        const log = receipt.logs[1];
    
        assert.strictEqual(log.event, "PlayerTwo");
        assert.strictEqual(log.args.hashValue, aliceHash);
        assert.strictEqual(log.args.playerAddress, bob);
        assert.strictEqual(log.args.choice.toString(10), bobWinChoice.toString(10));
      });
    
    });

  });

});