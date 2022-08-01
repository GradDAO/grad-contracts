const { ethers } = require("hardhat");

async function main() {
    const daiAddress = "0xcB8ADE5a0122D2Ee4fD91b0d533d4d7c63044ce7";
    const deployer = await ethers.getSigner();
    const claimFactory = await ethers.getContractFactory("Claim", deployer);
    const claim = await claimFactory.deploy(100, daiAddress);
    await claim.deployed();
    console.log("CLAIM DEPLOYED AT", claim.address);
    console.log("WITH PARAMS:", 100, daiAddress);
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
