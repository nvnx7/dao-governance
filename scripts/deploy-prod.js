const { ethers, network } = require("hardhat");

const dAppName = "TestDApp";
const tokenParams = { name: "TestToken", symbol: "TTK" };
const timelockParams = {
  minDelay: 600, // in sec
  proposers: [],
  executors: [],
};
const governorParams = {
  name: dAppName,
  votingDelay: 10, // in blocks
  votingPeriod: 50, // in blocks
  proposalThreshold: 0,
  quorumFraction: 4,
};

const useNFTVotes = false;

async function main() {
  console.log("PRODUCTION DEPLOYMENT NETWORK:", network.name);
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log(
    "Deployer account balance:",
    (await deployer.getBalance()).toString()
  );

  this.GovernanceToken = await ethers.getContractFactory("DaoToken");
  this.GovernanceTimelock = await ethers.getContractFactory("DaoTimelock");
  this.Governor = await ethers.getContractFactory("DaoGovernor");

  console.log("Deploying governance token...");
  this.token = await this.GovernanceToken.deploy(
    tokenParams.name,
    tokenParams.symbol
  );

  console.log("Deploying governance timelock...");
  this.timelock = await this.GovernanceTimelock.deploy(
    timelockParams.minDelay,
    timelockParams.proposers,
    timelockParams.executors
  );

  console.log("Deploying governor...");
  this.governor = await this.Governor.deploy(
    governorParams.name,
    governorParams.votingDelay,
    governorParams.votingPeriod,
    governorParams.proposalThreshold,
    this.token.address,
    governorParams.quorumFraction,
    this.timelock.address
  );

  console.log("\nDEPLOYMENTS:");
  console.log("Token:", token.address);
  console.log("Timelock:", timelock.address);
  console.log("Governor:", governor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
