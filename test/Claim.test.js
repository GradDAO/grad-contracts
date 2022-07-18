const { ethers } = require("hardhat");
const { expect, assert } = require("chai");
const { smock } = require("@defi-wonderland/smock");
const BigNumber = require('bignumber.js');

describe("Claim Test", async () => {
    let deployer, alice, bob, carol;
    let erc20Factory;
    let dai;

    before(async () => {
        [deployer, team, investor, adviser, alice, bob, carol] = await ethers.getSigners();
        erc20Factory = await smock.mock("MockERC20");
        claimFactory = await ethers.getContractFactory("Claim");
    });

    beforeEach(async () => {
        //dai = await erc20Factory.deploy("MockERC20", "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E");

        dai = await ethers.getContractAt(
            "MockERC20",
            "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"
        );
        claim = await claimFactory.deploy(100, "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"); // set initial GRAD price as $0.01
    });

    describe("Claim: basic functions", async () => { 
        it("Get share", async () => {
            const percent_ = await claim.getShare(
                BigNumber(7 * 1e5 * 1e9).toString(),
                BigNumber(70 * 1e6 * 1e9).toString(),
                BigNumber(5 * 1e4).toString()
            );
            expect(percent_).to.equal(5 * 1e2);
        });
    
        it("Change Grad Price", async () => {
            const currentPrice = await claim.gradPrice();
            await claim.changeGradPrice(1000);
            const newGradPrice = await claim.gradPrice();
            expect(newGradPrice - currentPrice).to.equal(900);
        });
    
        it("Change payment token", async () => {
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
    
        it("Toggle status", async () => {
            const currentStatus = await claim.saleOpened();
            expect(currentStatus).to.equal(false);
            
            await claim.toggleSaleStatus();
    
            const newStatus = await claim.saleOpened();
            expect(newStatus).to.equal(true);
        });
    
        it("Add investor to whitelist", async () => {
            const currentAmountOfTokens = await claim.saleInvestorWhitelist(investor.address);
            expect(currentAmountOfTokens).to.equal(0);
    
            await claim.setAddressToInvestorWhitelist(investor.address, 1 * 1e6 * 1e9);
    
            const NewAmountOfTokens = await claim.saleInvestorWhitelist(investor.address);
            expect(NewAmountOfTokens).to.equal(1 * 1e6 * 1e9);
        });
    });

    describe("Claim: SetTerm", async () => { 
        it("SetTerms: Cannot allocate more percents", async () => {
            await expect(
                claim.setTerm(investor.address, 5 * 1e5 + 1, 1 * 1e6 * 1e9, 1)
            ).to.be.revertedWith("Cannot allocate more percents");
        });
            
        it("SetTerms: Cannot allocate more tokens", async () => {
            await expect(
                claim.setTerm(investor.address, 5 * 1e4, BigNumber(70 * 1e6 * 1e9).plus(1).toString(), 1)
            ).to.be.revertedWith("Cannot allocate more tokens");
        });

        it("SetTerms: Success", async () => {
            const currentTerms = await claim.terms(investor.address);
            expect(currentTerms.percent).to.equal(0);
            expect(currentTerms.max).to.equal(0);
            expect(currentTerms.claimer).to.equal(0);

            await claim.setTerm(investor.address, 5 * 1e4, 1 * 1e6 * 1e9, 1);

            const newTerms = await claim.terms(investor.address);

            expect(newTerms.percent).to.equal(5 * 1e4);
            expect(newTerms.max).to.equal(1 * 1e6 * 1e9);
            expect(newTerms.claimer).to.equal(1);
        });
    });

    describe("Claim: WalletChange", async () => { 
        beforeEach(async () => {
            await claim.setTerm(investor.address, 5 * 1e3, 1 * 1e6 * 1e9, 1);
        });

        it("WalletChange: No wallet to change", async () => {
            await expect(
                claim.connect(adviser).pushWalletChange(adviser.address)
            ).to.be.revertedWith("No wallet to change");
        });

        it("WalletChange: Success", async () => {
            await claim.connect(investor).pushWalletChange(bob.address);
            const walletChange = await claim.walletChange(investor.address);
            expect(walletChange).to.be.equal(bob.address);
        });

        describe("WalletChange: pullWalletChange", async () => {
            beforeEach(async () => {
                await claim.connect(investor).pushWalletChange(bob.address);
            });

            it("pullWalletChange: Old wallet did not push", async () => {
                await expect(
                    claim.connect(alice).pullWalletChange(investor.address)
                ).to.be.revertedWith("Old wallet did not push");
            });

            it("pullWalletChange: Wallet already exists", async () => {
                await claim.setTerm(bob.address, 5 * 1e3, 1 * 1e6 * 1e9, 1);
                await expect(
                    claim.connect(bob).pullWalletChange(investor.address)
                ).to.be.revertedWith("Wallet already exists");
            });

            it("pullWalletChange: Success", async () => {
                const currentOldAddresTerm = await claim.terms(investor.address);
                expect(currentOldAddresTerm.percent).to.equal(5 * 1e3);
                const currentNewAddresTerm = await claim.terms(bob.address);
                expect(currentNewAddresTerm.percent).to.equal(0);

                await claim.connect(bob).pullWalletChange(investor.address)

                const newOldAddresTerm = await claim.terms(investor.address);
                expect(newOldAddresTerm.percent).to.equal(0);
                const newNewAddresTerm = await claim.terms(bob.address);
                expect(newNewAddresTerm.percent).to.equal(5 * 1e3);
            });
        });
        
        describe("Claim: But Investor Allocation", async () => { 
            it("Cannot buy without sale is started", async () => {
                await expect(
                    claim.connect(investor).buyInvestorsAllocation(investor.address, 1000 * 1e9)
                ).to.be.revertedWith("Sale is closed");
            });

            it("Cannot buy without been witelisted", async () => {
                await claim.toggleSaleStatus();
                expect(await claim.saleOpened()).to.be.true;

                await expect(
                    claim.connect(investor).buyInvestorsAllocation(investor.address, 1000 * 1e9)
                ).to.be.revertedWith("Address is not whitelisted");
            });

            it("Cannot buy more than allowed", async () => {
                await claim.toggleSaleStatus();
                await claim.setAddressToInvestorWhitelist(investor.address, 1000 * 1e9);

                await expect(
                    claim.connect(investor).buyInvestorsAllocation(investor.address, 10000 * 1e9)
                ).to.be.revertedWith("Cannot buy more than allowed");
            });

            it("Success", async () => {
                dai.mint(investor, 100000 * 1e18);
                
                console.log(await dai.decimals());

                const balance = await dai.balanceOf(investor.address);
                expect(balance).to.be.equal(100000 * 1e18);


                //dai.connect(investor).approve(claim.address, 100000 * 1e18);
                // await claim.toggleSaleStatus();
                // await claim.setAddressToInvestorWhitelist(investor.address, 1 * 1e6 * 1e9);
                // await claim.connect(investor).buyInvestorsAllocation(investor.address, 1 * 1e6 * 1e9);

                // expect(dai.balanceOf(investor.address)).to.be.equal(90000 * 1e18);
            });
        });



        // describe("Claim: Withdraw", async () => { 
        // });
    });
});