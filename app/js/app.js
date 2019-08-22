const Web3 = require('web3');
const $ = require('jquery');
const assert = require('assert');
const { toWei, fromAscii, fromWei } = Web3.utils;

require('file-loader?name=../index.html!../index.html');

const truffleContract = require('truffle-contract');
const rockPaperScissorsJson = require('../../build/contracts/RockPaperScissors.json');
var port = process.env.PORT || 8545;

console.log(process.env);

if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    web3 = new Web3(web3.currentProvider);
} else {
    // Fallback.
    web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
}

const RockPaperScissors = truffleContract(rockPaperScissorsJson);
RockPaperScissors.setProvider(web3.currentProvider);

window.addEventListener('load', async () => {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log(accounts);
        if (!accounts.length) {
            $('#balance').html('N/A');
            throw new Error('No account with which to transact. NOTE: Don\'t forget to disable MetaMask');
        }

        owner = accounts[0];
        console.log('Owner: ', owner);

        const rockPaperScissors = await RockPaperScissors.deployed();
        console.log('Deployed: ', rockPaperScissors);

        const network = await web3.eth.net.getId();
        console.log('Network ID: ', network.toString(10));

    } catch (err) {
        console.error(err);
    }

});
