const { BN, fromAscii, toWei, soliditySha3 } = web3.utils;

// rPS = Rock Paper Scissors
const rPS = artifacts.require("RockPaperScissors");

const truffleAssert = require('truffle-assertions');

const resultTime = 1200; // <-- Change result time to be tested here
const time = 3600; // Around an hour
const oneEtherInWei = new BN(toWei("1"));
const aliceSecretBytes = fromAscii("aliceSecret");
const aliceChoice = new BN("1");
const lowInvalidChoice = new BN("0");
const highInvalidChoice = new BN("4");

contract('RockPaperScissors', (accounts) => {

  let rPSInstance;
  let owner, alice, bob;

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
  });

  describe("Function: encrypt", function() {

    describe("Basic Working", function() {

      it('Should encrypt the values correctly', async () => {
        const aliceHash = soliditySha3({type: 'uint', value: aliceChoice}, {type: 'bytes32', value: aliceSecretBytes}, {type: 'address', value: rPSInstance.address}, {type: 'address', value: alice});
        const encryptAliceHash = await rPSInstance.encrypt(aliceChoice, aliceSecretBytes, {from: alice});
  
        assert.strictEqual(aliceHash, encryptAliceHash, "Hash Values don't match");
      });
  
    });

    describe("Input Cases", function() {

      it('Should only work if two inputs are given', async () => {
        await truffleAssert.fails(
          rPSInstance.encrypt({from: alice}),
          null,
          ''
        );
      });
        
      it('Should only work if unique word is given', async () => {
        await truffleAssert.fails(
          rPSInstance.encrypt(aliceChoice, {from: alice}),
          null,
          ''
        );
      });
        
      it('Should only work if choice is given', async () => {
        await truffleAssert.fails(
          rPSInstance.encrypt(aliceSecretBytes, {from: alice}),
          null,
          ''
        );
      });
        
    });

    describe("Edge Cases", function() {

      it('Should only work if the choice > 0', async () => {
        await truffleAssert.fails(
          rPSInstance.encrypt(lowInvalidChoice, aliceSecretBytes, {from: alice}),
          null,
          'Invalid Choice Passed'
        );
      });

      it('Should only work if the choice < 4', async () => {
        await truffleAssert.fails(
          rPSInstance.encrypt(highInvalidChoice, aliceSecretBytes, {from: alice}),
          null,
          'Invalid Choice Passed'
        );
      });

    });

  });

});