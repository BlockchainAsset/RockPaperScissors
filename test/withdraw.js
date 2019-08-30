const { BN, fromAscii, toWei } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const wager = new BN(toWei('0.1')); // <-- Change ETH value to be tested here
const depositAmount = new BN(toWei('0.5')); // <-- Change ETH value to be tested here
const resultTime = 1200; // <-- Change result time to be tested here
const zero = new BN('0');
const time = 3600; // Around an hour
const oneEtherInWei = new BN(toWei("1"));
const aliceSecretBytes = fromAscii("aliceSecret");
const aliceChoice = new BN("1");
const bobWinChoice = new BN("2");
const hundred = new BN('100');

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

  describe("Function: withdraw", function() {

    describe("Basic Working", function() {

      it('Should withdraw the amount correctly', async () => {

        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});

        // Make transaction from Bob to playerTwo function.
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});
    
        // Reveal the results from Alice
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
    
        // Get initial balance of the account before the transaction is made.
        const startingBalanceOfAlice = new BN(await web3.eth.getBalance(alice));
    
        // Withdraw Amount
        const txReceiptOfWithdraw = await rPSInstance.withdraw(hundred, {from: alice});
        const gasUsedInWithdraw = new BN(txReceiptOfWithdraw.receipt.gasUsed);
        const gasPriceInWithdraw = new BN((await web3.eth.getTransaction(txReceiptOfWithdraw.tx)).gasPrice);
    
        // Get balance after the transactions.
        const endingBalanceOfAlice = new BN(await web3.eth.getBalance(alice));
    
        const aliceStartAmountGas = startingBalanceOfAlice.add(hundred).sub(gasUsedInWithdraw.mul(gasPriceInWithdraw));
    
        // Check if the result is correct or not
        assert.strictEqual(endingBalanceOfAlice.toString(10),aliceStartAmountGas.toString(10), "Amount wasn't correctly received by Alice");
      });
      
    });

    describe("Edge Cases", function() {

      it('Should only work if amount > 0', async () => {
        await truffleAssert.fails(
          rPSInstance.withdraw(zero, {from: alice}),
          null,
          'Zero cant be withdrawn'
        );
      })
    
      it('Should only work if balance > amount', async () => {
        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        // Make transaction from Bob to playerTwo function.
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});    
        // Reveal the results from Alice
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
        await truffleAssert.fails(
          rPSInstance.withdraw(depositAmount, {from: alice}),
          null,
          'SafeMath: subtraction overflow.'
        );
      })
  
    });

    describe("Input Cases", function() {

      it('Should only work if amount is given', async () => {
        await truffleAssert.fails(
          rPSInstance.withdraw({from: alice}),
          null,
          'invalid number value'
        );
      })

    });

    describe("Event Cases", function() {
  
      it("Should correctly emit the proper event: Withdrawed", async () => {
        // Make transaction from alice account to playerOne function.
        await rPSInstance.playerOne(aliceHash, wager, time, bob, {from: alice, value: depositAmount});
        // Make transaction from Bob to playerTwo function.
        await rPSInstance.playerTwo(aliceHash, bobWinChoice, {from: bob, value: depositAmount});    
        // Reveal the results from Alice
        await rPSInstance.reveal(aliceChoice, aliceSecretBytes, {from: alice});
        const withdrawReceipt = await rPSInstance.withdraw(hundred, {from: alice});

        assert.strictEqual(withdrawReceipt.logs.length, 1);
        const log = withdrawReceipt.logs[0];
    
        assert.strictEqual(log.event, "Withdrawed");
        assert.strictEqual(log.args.to, alice);
        assert.strictEqual(log.args.value.toString(10),hundred.toString(10));
      });
  
    });

  });

});
