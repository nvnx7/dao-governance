require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const rinkebyUrl = process.env.RINKEBY_URL || "";
const rinkebyDeployerPk = process.env.RINKEBY_DEPLOYER_PRIVATE_KEY;
const mainnetUrl = process.env.MAINNET_URL || "";
const mainnetDeployerPk = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    rinkeby: {
      url: rinkebyUrl,
      accounts: rinkebyDeployerPk ? [rinkebyDeployerPk] : [],
    },
    mainnet: {
      url: mainnetUrl,
      accounts: mainnetDeployerPk ? [mainnetDeployerPk] : [],
    },
  },
  solidity: "0.8.7",
};
