const { ethers, network } = require("hardhat");
const logger = require("./logger");

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
  console.log("STAGING DEPLOYMENT NETWORK:", network.name);
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log(
    "Deployer account balance:",
    (await deployer.getBalance()).toString()
  );

  const GovernanceToken = await ethers.getContractFactory("DaoToken");
  const GovernanceTimelock = await ethers.getContractFactory("DaoTimelock");
  const Governor = await ethers.getContractFactory("DaoGovernor");

  console.log(
    `Deploying governance token (${useNFTVotes ? "ERC721" : "ERC20"})...`
  );
  const token = await GovernanceToken.deploy(
    tokenParams.name,
    tokenParams.symbol
  );

  console.log("Deploying governance timelock...");
  const timelock = await GovernanceTimelock.deploy(
    timelockParams.minDelay,
    timelockParams.proposers,
    timelockParams.executors
  );

  console.log("Deploying governor...");
  const governor = await Governor.deploy(
    governorParams.name,
    governorParams.votingDelay,
    governorParams.votingPeriod,
    governorParams.proposalThreshold,
    token.address,
    governorParams.quorumFraction,
    timelock.address
  );

  const tokenTx = await token.deployTransaction.wait();
  const timelockTx = await timelock.deployTransaction.wait();
  const governorTx = await governor.deployTransaction.wait();

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
