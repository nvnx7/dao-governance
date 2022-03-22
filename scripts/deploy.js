const { ethers, network } = require("hardhat");
const logger = require("./logger");

const dAppName = "TestDApp";
const tokenParams = {
  name: "TestToken",
  symbol: "TTK",
  initialSupply: ethers.BigNumber.from("1000000000000000000000"),
};
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

const useNFTVotes = true;

async function main() {
  // Behave close to rinkeby/mainnet for hardhat network
  if (network.name === "hardhat") {
    await network.provider.send("evm_setAutomine", [false]);
    await network.provider.send("evm_setIntervalMining", [13000]);
  }

  console.log("DEPLOYMENT NETWORK:", network.name);
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log(
    "Deployer account balance:",
    (await deployer.getBalance()).toString()
  );

  const GovernanceToken = await (useNFTVotes
    ? ethers.getContractFactory("DaoNFT")
    : ethers.getContractFactory("DaoToken"));
  const GovernanceTimelock = await ethers.getContractFactory("DaoTimelock");
  const Governor = await ethers.getContractFactory("DaoGovernor");

  console.log(
    `Deploying governance token (${useNFTVotes ? "ERC721" : "ERC20"})...`
  );

  let token;
  if (useNFTVotes) {
    token = await GovernanceToken.deploy(tokenParams.name, tokenParams.symbol);
  } else {
    token = await GovernanceToken.deploy(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.initialSupply
    );
  }

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

  console.log("Granting roles...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  await timelock.grantRole(PROPOSER_ROLE, governor.address);
  await timelock.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero);

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
