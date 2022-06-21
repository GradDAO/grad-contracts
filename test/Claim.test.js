const { ethers } = require("hardhat");
const { expect } = require("chai");
const { smock } = require("@defi-wonderland/smock");

describe("Claim", async () => {
    let deployer, alice, bob, carol;
    let erc20Factory;
    let dai;

    before(async () => {
        [deployer, developer, investor, adviser] = await ethers.getSigners();
        erc20Factory = await smock.mock("MockERC20");
        claimFactory = await ethers.getContractFactory("Claim");
    });

    beforeEach(async () => {
        // dai = await erc20Factory.deploy("Dai", "DAI", 18);
        dai = await ethers.getContractAt(
            "MockERC20",
            "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"
        );
        claim = await claimFactory.deploy(100); // set initial GRAD price as $0.01

        dai.mint(investor, 100000 * 1e18);
        dai.connect(investor).approve(claim.address, 100000 * 1e18);
    });

    it("Cannot buy without sale is started", async () => {
        await expect(
            claim.connect(investor).buyAllocation(investor.address, 1000 * 1e9)
        ).to.be.revertedWith("Sale is closed");
    });

    it("Cannot buy without been witelisted", async () => {
        await claim.toggleSaleStatus();
        expect(await claim.saleOpened()).to.be.true;

        await expect(
            claim.connect(investor).buyAllocation(investor.address, 1000 * 1e9)
        ).to.be.revertedWith("Address is not whitelisted");
    });

    it("Cannot buy more than allowed", async () => {
        await claim.toggleSaleStatus();
        await claim.setWhitelist(investor.address, 1000 * 1e9);

        await expect(
            claim.connect(investor).buyAllocation(investor.address, 10000 * 1e9)
        ).to.be.revertedWith("Cannot buy more than allowed");
    });
});
