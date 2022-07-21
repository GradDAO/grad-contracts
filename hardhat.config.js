require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

// Ensure that we have all the environment variables we need.
const goerlyApiKey = process.env.GOERLI_API_KEY ?? "NO_PRIVATE_KEY";
const polygonApiKey = process.env.POLYGON_API_KEY ?? "NO_PRIVATE_KEY";
const etherscanApiKey = process.env.ETHERSCAN_API_KEY ?? "NO_ETHERSCAN_API_KEY";
// Make sure node is setup on Alchemy website
const privateKey = process.env.DEPLOYER_PRIVATE_KEY ?? "NO_ALCHEMY_API_KEY";

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${goerlyApiKey}`,
            accounts: [privateKey],
        },
        polygon: {
            url: `https://polygon-mainnet.g.alchemy.com/v2/${polygonApiKey}`,
            accounts: [privateKey],
        },
    },
    etherscan: {
        apiKey: etherscanApiKey,
    },
    solidity: {
        compilers: [
            {
                version: "0.8.15",
                settings: {
                    metadata: {
                        bytecodeHash: "none",
                    },
                    optimizer: {
                        enabled: true,
                        runs: 800,
                    },
                    outputSelection: {
                        "*": {
                            "*": ["storageLayout"],
                        },
                    },
                },
            },
            {
                version: "0.8.10",
                settings: {
                    metadata: {
                        bytecodeHash: "none",
                    },
                    optimizer: {
                        enabled: true,
                        runs: 800,
                    },
                    outputSelection: {
                        "*": {
                            "*": ["storageLayout"],
                        },
                    },
                },
            },
        ],
    },
};
