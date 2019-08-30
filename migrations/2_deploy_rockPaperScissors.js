const RockPaperScissors = artifacts.require("RockPaperScissors");
// Default Values
const maxGamePlayTime = 3600; // Around an hour
const resultTime = 1200; // <-- Change result time to be tested here

module.exports = function(deployer, network, accounts) {
  console.log("network:", network);
  console.log("accounts:", accounts);
  deployer.deploy(RockPaperScissors, maxGamePlayTime, resultTime, true);
};
