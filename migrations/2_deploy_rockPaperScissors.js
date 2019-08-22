const RockPaperScissors = artifacts.require("RockPaperScissors");

module.exports = function(deployer, network, accounts) {
  console.log("network:", network);
  console.log("accounts:", accounts);
  deployer.deploy(RockPaperScissors, true);
};
