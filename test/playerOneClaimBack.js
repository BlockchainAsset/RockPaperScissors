const { BN, fromAscii, toWei } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const wager = new BN(toWei('0.1')); // <-- Change ETH value to be tested here
const depositAmount = new BN(toWei('0.5')); // <-- Change ETH value to be tested here
const withdrawAmount = new BN(toWei('0.2')); // <-- Change ETH value to be tested here
const resultTime = 1200; // <-- Change result time to be tested here
const zero = new BN('0');
const oneSecond = new BN('1');
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

  describe("Function: playerOneClaimBack", function() {

    describe("Basic Working", function() {
      it('Should claim back the amount correctly', async () => {

        // Get the starting balance of Alice in the contract before the transaction is made.
        const contractStartingBalanceOfAlice = new BN(await rPSInstance.balances(alice));

        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, zero, bob, {from: alice, value: depositAmount});

        await wait(oneSecond);

        // Reveal the results from Alice
        await rPSInstance.playerOneClaimBack(aliceHash, {from: alice});
    
        // Get the final balance of Alice in the contract after the transaction is made.
        const contractEndingBalanceOfAlice = new BN(await rPSInstance.balances(alice));
    
        // Check if the result is correct or not
        assert.strictEqual(contractEndingBalanceOfAlice.toString(10),(contractStartingBalanceOfAlice.add(depositAmount)).toString(10), "Amount wasn't correctly received by Alice");
    
      });
    });

    describe("Edge Cases", function() {

      it('Should only allow to claim back if the deadline is passed', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerOneClaimBack(aliceHash, {from: alice}),
          null,
          'Deadline is not over'
        );
      });
    
      it('Should only allow to claim back if player 2 has not played yet', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerOneClaimBack(aliceHash, {from: alice}),
          null,
          'Deadline is not over'
        );
      });

    });
    
    describe("Input Cases", function() {

      it('Should only work if hashValue is given', async () => {
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        await truffleAssert.fails(
          rPSInstance.playerOneClaimBack({from: alice}),
          null,
          'invalid bytes32 value'
        );
      });
    });
    
    describe("Event Cases", function() {
      it("Should correctly emit the proper event: PlayerOneClaimBack", async () => {
        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, zero, bob, {from: alice, value: depositAmount});    
        await wait(oneSecond);
        const claimBackReceipt = await rPSInstance.playerOneClaimBack(aliceHash, {from: owner});

        assert.strictEqual(claimBackReceipt.logs.length, 1);
        const log = claimBackReceipt.logs[0];
    
        assert.strictEqual(log.event, "PlayerOneClaimBack");
        assert.strictEqual(log.args.hashValue, aliceHash);
        assert.strictEqual(log.args.playerAddress, alice);
        assert.strictEqual(log.args.initiatorAddress, owner);
      });
    });
    
  });

});