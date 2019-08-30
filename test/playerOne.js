const { BN, fromAscii, toWei } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const wager = new BN(toWei('0.1')); // <-- Change ETH value to be tested here
const depositAmount = new BN(toWei('0.5')); // <-- Change ETH value to be tested here
const resultTime = 1200; // <-- Change result time to be tested here
const zero = new BN('0');
const time = 3600; // Around an hour
const invalidTime = 4000;
const oneEtherInWei = new BN(toWei("1"));
const aliceSecretBytes = fromAscii("aliceSecret");
const aliceChoice = new BN("1");

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

  describe("Function: playerOne", function() {

    describe("Basic Working", function() {

      it('playerOne should be able to play correctly', async () => {
        // Make transaction from Alice to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
    
        // Get details of Alice and Wager from contract
        const contractEndingBalanceOfAlice = (await rPSInstance.balances(alice));
        const playDetails = (await rPSInstance.plays(aliceHash));
        const wagerAmountInContract = playDetails.wager;
        const playerOne = playDetails.playerOne;
        const playerTwo = playDetails.playerTwo;
    
        // Check if the result is correct or not
        assert.strictEqual(contractEndingBalanceOfAlice.toString(10),(depositAmount.sub(wager)).toString(10), "Contract Balance wasn't correctly credited to Alice");
        assert.strictEqual(wagerAmountInContract.toString(10), wager.toString(10), "Wager Amount is not correctly stored in the Play");
        assert.strictEqual(playerOne, alice, "Player 1 Address is not correctly stored in the Play");
        assert.strictEqual(playerTwo, bob, "Player 2 Address is not correctly stored in the Play");
      });
  
    });

    describe("Edge Cases", function() {

      it('playerOne function should not be allowed with the same hashValue as any previous playerOne', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount}),
          null,
          'Please choose another Unique Word'
        );
    
      });
        
      it('Should only work if there is enough balance', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: zero}),
          null,
          'SafeMath: subtraction overflow.'
        );
      });
  
      it('Should only work if deadline is <= 1 hour', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, wager, invalidTime, bob, {from: alice, value: depositAmount}),
          null,
          'Each play is restricted to be max of a particular amount of time'
        );
      });
  
      it('Should only work if atleast 1 Wei is wagered', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, zero, time, bob, {from: alice, value: depositAmount}),
          null,
          'Atleast 1 wei bet is required'
        );
      });
  
    });

    describe("Input Cases", function() {

      it('Should only work if Hash is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(wager, time, bob, {from: alice, value: depositAmount}),
          null,
          'invalid bytes32 value'
        );
      });
    
      it('Should only work if wager is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, time, bob, {from: alice, value: depositAmount}),
          null,
          'invalid address'
        );
      });
  
      it('Should only work if deadline is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, wager, bob, {from: alice, value: depositAmount}),
          null,
          'invalid address'
        );
      });
  
      it('Should only work if player 2 address is given', async () => {
        await truffleAssert.fails(
          rPSInstance.playerOne(aliceHash, wager, time, {from: alice, value: depositAmount}),
          null,
          'invalid address'
        );
      });
  
    });

    describe("Event Cases", function() {
      
      it("Should correctly emit the proper event: Deposit", async () => {
        const receipt = await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});

        assert.strictEqual(receipt.logs.length, 2);
        const log = receipt.logs[0];
    
        assert.strictEqual(log.event, "Deposit");
        assert.strictEqual(log.args.playerAddress, alice);
        assert.strictEqual(log.args.value.toString(10), depositAmount.toString(10));
      });
    
      it("Should correctly emit the proper event: PlayerOne", async () => {
        const receipt = await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});

        assert.strictEqual(receipt.logs.length, 2);
        const log = receipt.logs[1];
    
        assert.strictEqual(log.event, "PlayerOne");
        assert.strictEqual(log.args.hashValue, aliceHash);
        assert.strictEqual(log.args.playerAddress, alice);
        assert.strictEqual(log.args.bet.toString(10), wager.toString(10));
      });
    
    });

  });

});