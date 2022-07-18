const { ethers } = require("hardhat");
const { expect, assert } = require("chai");
const { smock } = require("@defi-wonderland/smock");
const BigNumber = require('bignumber.js');

describe("Claim Test", async () => {
    let deployer, alice, bob, carol;
    let erc20Factory;
    let dai;

    before(async () => {
        [deployer, team, investor, adviser] = await ethers.getSigners();
        erc20Factory = await smock.mock("MockERC20");
        claimFactory = await ethers.getContractFactory("Claim");
    });

    beforeEach(async () => {
        // dai = await erc20Factory.deploy("Dai", "DAI", 18);
        dai = await ethers.getContractAt(
            "MockERC20",
            "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"
        );
        claim = await claimFactory.deploy(100, "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"); // set initial GRAD price as $0.01

        dai.mint(investor, 100000 * 1e18);
        dai.connect(investor).approve(claim.address, 100000 * 1e18);
    });

    it("get share", async () => {
        const percent_ = await claim.getShare(
            BigNumber(7 * 1e5 * 1e9).toString(),
            BigNumber(70 * 1e6 * 1e9).toString(),
            BigNumber(5 * 1e4).toString()
        );
        expect(percent_).to.equal(5 * 1e2);
    });

    it("change Grad Price", async () => {
        const currentPrice = await claim.gradPrice();
        await claim.changeGradPrice(1000);
        const newGradPrice = await claim.gradPrice();
        expect(newGradPrice - currentPrice).to.equal(900);
    });

    it("change payment token", async () => {
        const currentPaymentToken = await claim.paymentToken();
        expect(currentPaymentToken).to.equal(dai.address);
        usdc = await ethers.getContractAt(
            "MockERC20",
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
        );
        await claim.changePaymentToken(usdc.address);
        const newPaymentToken = await claim.paymentToken();
        expect(newPaymentToken).to.equal(usdc.address);
    });

    it("toggle status", async () => {
        const currentStatus = await claim.saleOpened();
        expect(currentStatus).to.equal(false);
        
        await claim.toggleSaleStatus();

        const newStatus = await claim.saleOpened();
        expect(newStatus).to.equal(true);
    });

    // describe("Claim getShare", async () => { 
        
    // });

    // it("Cannot buy without sale is started", async () => {
    //     await expect(
    //         claim.connect(investor).buyAllocation(investor.address, 1000 * 1e9)
    //     ).to.be.revertedWith("Sale is closed");
    // });

    // it("Cannot buy without been witelisted", async () => {
    //     await claim.toggleSaleStatus();
    //     expect(await claim.saleOpened()).to.be.true;

    //     await expect(
    //         claim.connect(investor).buyAllocation(investor.address, 1000 * 1e9)
    //     ).to.be.revertedWith("Address is not whitelisted");
    // });

    // it("Cannot buy more than allowed", async () => {
    //     await claim.toggleSaleStatus();
    //     await claim.setWhitelist(investor.address, 1000 * 1e9);

    //     await expect(
    //         claim.connect(investor).buyAllocation(investor.address, 10000 * 1e9)
    //     ).to.be.revertedWith("Cannot buy more than allowed");
    // });
});
