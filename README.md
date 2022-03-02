# DAO Governance Contracts

This project consists of contracts required to successfully deploy a DAO (OZ-compatible) on ethereum blockchain. It is built with Hardhat environment.

## Installation

The project dependencies include:

- [Hardhat](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/4.x/)
- [Waffle](https://getwaffle.io/)
- [Ethers](https://docs.ethers.io/v5/)

Install by:

```
yarn install
```

## Tests

Run tests by:

```
yarn test
```

## Deployment

Set the required environment variables in a `.env` file based off `.env.example`. Configure contract params in `scrips/deploy-<env>.js` file according to needs. Then run deployment:

- Development (local hardhat network)

  ```
  yarn deploy:dev
  ```

- Staging (rinkeby testnet)

  ```
  yarn deploy:staging
  ```

- Production (ethereum mainnet)
  ```
  yarn deploy:production
  ```

**Note**: After each deployment contract addresses are logged to `deploys.log` file in the root dir.
