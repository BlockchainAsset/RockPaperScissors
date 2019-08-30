const { BN, fromAscii, toWei } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const wager = new BN(toWei('0.1')); // <-- Change ETH value to be tested here
const depositAmount = new BN(toWei('0.5')); // <-- Change ETH value to be tested here
const resultTime = 0; // <-- Change result time to be tested here
const oneSecond = new BN('1');
const zero = new BN('0');
const time = 3600; // Around an hour
const oneEtherInWei = new BN(toWei("1"));
const aliceSecretBytes = fromAscii("aliceSecret");
const fakeSecretBytes = fromAscii("secret");
const aliceChoice = new BN("1");
const bobWinChoice = new BN("2");

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

  describe("Function: forceReveal", function() {

    describe("Basic Working", function() {

      it('Should reveal the results correctly', async () => {

        // Get the starting balance of Alice & Bob in the contract before the transaction is made.
        const contractStartingBalanceOfAlice = new BN(await rPSInstance.balances(alice));
        const contractStartingBalanceOfBob = new BN(await rPSInstance.balances(bob));

        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});

        // Make transaction from Bob to playerTwo function.
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
    
        await wait(oneSecond);

        // Reveal the results forcefully
        await rPSInstance.forceReveal(aliceHash, {from: bob});
    
        // Get the final balance of Alice & Bob in the contract after the transaction is made.
        const contractEndingBalanceOfAlice = new BN(await rPSInstance.balances(alice));
        const contractEndingBalanceOfBob = new BN(await rPSInstance.balances(bob));
    
        // Check if the result is correct or not
        assert.strictEqual(contractEndingBalanceOfAlice.toString(10),(contractStartingBalanceOfAlice.add(depositAmount).sub(wager)).toString(10), "Amount wasn't correctly subtracted from Alice");
        assert.strictEqual(contractEndingBalanceOfBob.toString(10),(contractStartingBalanceOfBob.add(depositAmount).add(wager)).toString(10), "Amount wasn't correctly added to Bob");    
      });
    });
    
    describe("Edge Cases", function() {

      it('Should only allow if Hash is Correct', async () => {
        await rPSInstance.playerOne(aliceHash, wager, zero, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await wait(oneSecond);
        await truffleAssert.fails(
          rPSInstance.forceReveal(fakeSecretBytes, {from: bob}),
          null,
          'Play Ended'
        );
      });
        
      it('Should only allow if the play is not ended', async () => {
        await rPSInstance.playerOne(aliceHash, wager, zero, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await wait(oneSecond);
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
        await truffleAssert.fails(
          rPSInstance.forceReveal(aliceHash, {from: bob}),
          null,
          'Play Ended'
        );
      });
        
      it('Should not allow if the play is already revealed', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
        await truffleAssert.fails(
          rPSInstance.forceReveal(aliceHash, {from: bob}),
          null,
          'Play Ended'
        );
      });
        
      it('Should only allow if the play is not ended', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
        await truffleAssert.fails(
          rPSInstance.forceReveal(aliceHash, {from: bob}),
          null,
          'Play Ended'
        );
      });

    });
    
    describe("Input Cases", function() {
    
      it('Should only work if Hash is given', async () => {
        await truffleAssert.fails(
          rPSInstance.forceReveal({from: bob}),
          null,
          'invalid bytes32 value'
        );
      });
    
    });
    
    describe("Event Cases", function() {
      it("Should correctly emit the proper event: ForceReveal", async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await wait(oneSecond);
        const receipt = await rPSInstance.forceReveal(aliceHash, {from: bob});

        assert.strictEqual(receipt.logs.length, 1);
        const log = receipt.logs[0];
    
        assert.strictEqual(log.event, "ForceReveal");
        assert.strictEqual(log.args.hashValue, aliceHash);
        assert.strictEqual(log.args.winnerAddress, bob);
        assert.strictEqual(log.args.revealAddress, bob);
      });
    });
    
  });
});