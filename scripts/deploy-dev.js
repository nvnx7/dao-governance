const { ethers, network } = require("hardhat");
const logger = require("./logger");

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

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
  // Behave close to rinkeby/mainnet
  await network.provider.send("evm_setAutomine", [false]);
  await network.provider.send("evm_setIntervalMining", [13000]);

  console.log("DEV DEPLOYMENT NETWORK:", network.name);
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log(
    "Deployer account balance:",
    (await deployer.getBalance()).toString()
  );

  this.GovernanceToken = await (useNFTVotes
    ? ethers.getContractFactory("DaoNFT")
    : ethers.getContractFactory("DaoToken"));
  this.GovernanceTimelock = await ethers.getContractFactory("DaoTimelock");
  this.Governor = await ethers.getContractFactory("DaoGovernor");

  console.log(
    `Deploying governance token (${useNFTVotes ? "ERC721" : "ERC20"})...`
  );
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

  const tokenTx = await this.token.deployTransaction.wait();
  const timelockTx = await this.timelock.deployTransaction.wait();
  const governorTx = await this.governor.deployTransaction.wait();

  logger.info(
    `\nDEPLOYMENTS: (${network.name})
    Token: ${token.address} (block: ${tokenTx.blockNumber})
    Timelock: ${timelock.address} (block: ${timelockTx.blockNumber})
    Governor: ${governor.address} (block: ${governorTx.blockNumber})`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
