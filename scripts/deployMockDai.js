const { ethers } = require("hardhat");

async function main() {
    const deployer = await ethers.getSigner();
    const mockDaiFactory = await ethers.getContractFactory(
        "MockERC20",
        deployer
    );
    const mockDai = await mockDaiFactory.deploy("Dai", "DAI", 18);
    await mockDai.deployed();
    console.log("MOCK DAI DEPLOYED AT", mockDai.address);
    console.log("WITH PARAMS:", "Dai", "DAI", 18);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
