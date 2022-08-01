const { ethers } = require("hardhat");
const { expect, assert } = require("chai");
const { smock } = require("@defi-wonderland/smock");

describe("Claim Test", async () => {
    let deployer, alice, bob, carol;
    let erc20Factory;
    let dai;
    let daiDecimals = ethers.BigNumber.from("1000000000000000000");
    let gradDecimals = ethers.BigNumber.from("1000000000");

    before(async () => {
        [deployer, team, investor, adviser, alice, bob, carol] =
            await ethers.getSigners();
        erc20Factory = await smock.mock("MockERC20");
        claimFactory = await ethers.getContractFactory("Claim");
    });

    beforeEach(async () => {
        dai = await erc20Factory.deploy("Dai", "DAI", 18);
        claim = await claimFactory.deploy(100, dai.address); // set initial GRAD price as $0.01
    });

    describe("Claim: basic functions", async () => {
        it("Get share", async () => {
            const percent_ = await claim.getShare(
                gradDecimals.mul(700000),
                gradDecimals.mul(70000000),
                50000
            );
            expect(percent_).to.equal(5 * 1e2);
        });

        describe("Basic functions: Change Grad Price", async () => {
            it("Change Grad Price: caller is not the owner", async () => {    
                await expect(
                    claim.connect(bob).changeGradPrice(100)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
    
            it("Change Grad Price: Success", async () => {
                const currentPrice = await claim.gradPrice();
                await claim.changeGradPrice(1000);
                const newGradPrice = await claim.gradPrice();
                expect(newGradPrice - currentPrice).to.equal(900);
            });
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

        describe("Basic functions: toggle status", async () => {
            it("Toggle status: caller is not the owner", async () => {
                const currentStatus = await claim.saleOpened();
                expect(currentStatus).to.equal(false);
    
                await expect(
                    claim.connect(bob).toggleSaleStatus()
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
    
            it("Toggle status: Success", async () => {
                const currentStatus = await claim.saleOpened();
                expect(currentStatus).to.equal(false);
    
                await claim.toggleSaleStatus();
    
                const newStatus = await claim.saleOpened();
                expect(newStatus).to.equal(true);
            });
        });

        describe("Basic functions: add investor to whitelist", async () => {
            it("Add investor to whitelist: caller is not the owner", async () => {
                await expect(claim.connect(bob).setAddressToInvestorWhitelist(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                )).to.be.revertedWith("Ownable: caller is not the owner");
            });
    
            it("Add investor to whitelist: Success", async () => {
                const currentAmountOfTokens = await claim.saleInvestorWhitelist(
                    investor.address
                );
                expect(currentAmountOfTokens).to.equal(0);
    
                await claim.setAddressToInvestorWhitelist(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                );
    
                const NewAmountOfTokens = await claim.saleInvestorWhitelist(
                    investor.address
                );
                expect(NewAmountOfTokens).to.equal(gradDecimals.mul(1 * 1e6));
            });
        });
    });

    describe("Claim: SetTerm", async () => {
        it("SetTerms: caller is not the owner", async () => {
            await expect(claim.connect(bob).setTerm(
                    investor.address,
                    5 * 1e8 + 1,
                    gradDecimals.mul(1 * 1e6),
                    1
            )).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("SetTerms: Cannot allocate more percents", async () => {
            await expect(
                claim.setTerm(
                    investor.address,
                    5 * 1e8 + 1,
                    gradDecimals.mul(1 * 1e6),
                    1
                )
            ).to.be.revertedWith("Cannot allocate more percents");
        });

        it("SetTerms: Cannot allocate more tokens", async () => {
            await expect(
                claim.setTerm(
                    investor.address,
                    5 * 1e8,
                    gradDecimals.mul(70 * 1e6).add(1),
                    1
                )
            ).to.be.revertedWith("Cannot allocate more tokens");
        });

        it("SetTerms: Cannot change type of a claimer", async () => {
            await claim.setTerm(
                carol.address,
                5 * 1e7,
                gradDecimals.mul(1 * 1e5),
                2
            );

            await expect(
                claim.setTerm(
                    carol.address,
                    5 * 1e7,
                    gradDecimals.mul(1 * 1e5),
                    0
                )
            ).to.be.revertedWith("Cannot change type of a claimer");
        });

        it("SetTerms: Success", async () => {
            const currentTerms = await claim.terms(investor.address);
            expect(currentTerms.percent).to.equal(0);
            expect(currentTerms.max).to.equal(0);
            expect(currentTerms.claimer).to.equal(0);

            await claim.setTerm(
                investor.address,
                5 * 1e8,
                gradDecimals.mul(1 * 1e6),
                1
            );

            const newTerms = await claim.terms(investor.address);

            expect(newTerms.percent).to.equal(5 * 1e8);
            expect(newTerms.max).to.equal(gradDecimals.mul(1 * 1e6));
            expect(newTerms.claimer).to.equal(1);
        });
    });

    describe("Claim: WalletChange", async () => {
        beforeEach(async () => {
            await claim.setTerm(
                investor.address,
                5 * 1e7,
                gradDecimals.mul(1 * 1e6),
                1
            );
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
                await claim.setTerm(
                    bob.address,
                    5 * 1e7,
                    gradDecimals.mul(1 * 1e6),
                    1
                );
                await expect(
                    claim.connect(bob).pullWalletChange(investor.address)
                ).to.be.revertedWith("Wallet already exists");
            });

            it("pullWalletChange: Success", async () => {
                const currentOldAddresTerm = await claim.terms(
                    investor.address
                );
                expect(currentOldAddresTerm.percent).to.equal(5 * 1e7);
                const currentNewAddresTerm = await claim.terms(bob.address);
                expect(currentNewAddresTerm.percent).to.equal(0);

                await claim.connect(bob).pullWalletChange(investor.address);

                const newOldAddresTerm = await claim.terms(investor.address);
                expect(newOldAddresTerm.percent).to.equal(0);
                const newNewAddresTerm = await claim.terms(bob.address);
                expect(newNewAddresTerm.percent).to.equal(5 * 1e7);
            });
        });
    });

    describe("Claim: Buy Investor Allocation", async () => {
        it("Cannot buy without sale is started", async () => {
            await expect(
                claim
                    .connect(investor)
                    .buyInvestorsAllocation(
                        investor.address,
                        gradDecimals.mul(1000)
                    )
            ).to.be.revertedWith("Sale is closed");
        });

        it("Cannot buy without been witelisted", async () => {
            await claim.toggleSaleStatus();
            expect(await claim.saleOpened()).to.be.true;

            await expect(
                claim
                    .connect(investor)
                    .buyInvestorsAllocation(
                        investor.address,
                        gradDecimals.mul(1000)
                    )
            ).to.be.revertedWith("Address is not whitelisted");
        });

        it("Cannot buy more than allowed", async () => {
            await claim.toggleSaleStatus();
            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(10000)
            );

            await expect(
                claim
                    .connect(investor)
                    .buyInvestorsAllocation(
                        investor.address,
                        gradDecimals.mul(100000)
                    )
            ).to.be.revertedWith("Cannot buy more than allowed");
        });

        it("Cannot buy less than 0.14 GRAD", async () => {
            await claim.toggleSaleStatus();
            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(10000)
            );

            await expect(
                claim
                    .connect(investor)
                    .buyInvestorsAllocation(
                        investor.address,
                        gradDecimals.mul(1399).div(1e4)
                    )
            ).to.be.revertedWith("Amount of tokens is too small");

            await expect(
                claim
                    .connect(investor)
                    .buyInvestorsAllocation(
                        investor.address,
                        gradDecimals.mul(1400).div(1e4)
                    )
            ).to.be.revertedWith("TRANSFER_FROM_FAILED");
        });

        it("Success", async () => {
            await dai.mint(investor.address, daiDecimals.mul(100000));

            const balance = await dai.balanceOf(investor.address);
            expect(balance).to.be.equal(daiDecimals.mul(100000));

            await dai
                .connect(investor)
                .approve(claim.address, daiDecimals.mul(100000));

            await claim.toggleSaleStatus();

            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(1 * 1e6)
            );

            await claim
                .connect(investor)
                .buyInvestorsAllocation(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                );

            expect(await dai.balanceOf(investor.address)).to.be.equal(
                daiDecimals.mul(90000)
            );

            const terms = await claim.terms(investor.address);
            expect(terms.max).to.be.equal(gradDecimals.mul(1 * 1e6));

            expect(terms.percent).to.be.equal(7142857);
            expect(terms.claimer).to.be.equal(1);
        });
        it("Purchases are summing up", async () => {
            await dai.mint(investor.address, daiDecimals.mul(100000));
            await dai
                .connect(investor)
                .approve(claim.address, daiDecimals.mul(100000));

            await claim.toggleSaleStatus();

            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(3 * 1e6)
            );

            await claim
                .connect(investor)
                .buyInvestorsAllocation(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                );

            await claim
                .connect(investor)
                .buyInvestorsAllocation(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                );

            expect(await dai.balanceOf(investor.address)).to.be.equal(
                daiDecimals.mul(80000)
            );

            const terms = await claim.terms(investor.address);
            expect(terms.max).to.be.equal(gradDecimals.mul(2 * 1e6));
            expect(terms.percent).to.be.equal(2 * 7142857);
            expect(terms.claimer).to.be.equal(1);

            const restInWhitelist = await claim.saleInvestorWhitelist(
                investor.address
            );
            expect(restInWhitelist).to.be.equal(gradDecimals.mul(1 * 1e6));
        });
        it("Buy to another address", async () => {
            await dai.mint(investor.address, daiDecimals.mul(100000));
            await dai
                .connect(investor)
                .approve(claim.address, daiDecimals.mul(100000));

            await claim.toggleSaleStatus();

            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(1 * 1e6)
            );

            await claim
                .connect(investor)
                .buyInvestorsAllocation(
                    alice.address,
                    gradDecimals.mul(1 * 1e6)
                );

            expect(await dai.balanceOf(investor.address)).to.be.equal(
                daiDecimals.mul(90000)
            );

            const aliceTerms = await claim.terms(alice.address);
            expect(aliceTerms.max).to.be.equal(gradDecimals.mul(1 * 1e6));
            expect(aliceTerms.percent).to.be.equal(7142857);
            expect(aliceTerms.claimer).to.be.equal(1);

            const investorTerms = await claim.terms(investor.address);
            expect(investorTerms.max).to.be.equal(0);
            expect(investorTerms.percent).to.be.equal(0);
            expect(investorTerms.claimer).to.be.equal(0);
        });
    });

    describe("Claim: Withdraw", async () => {
        it("Withdraw: Ownable: caller is not the owner", async () => {
            await expect(
                claim
                    .connect(bob)
                    .withdraw(
                        bob.address,
                        dai.address,
                        daiDecimals.mul(1 * 1e6)
                    )
            ).to.be.revertedWith("caller is not the owner");
        });

        it("Withdraw: TRANSFER_FAILED", async () => {
            await expect(
                claim
                    .connect(deployer)
                    .withdraw(
                        deployer.address,
                        dai.address,
                        daiDecimals.mul(1 * 1e6)
                    )
            ).to.be.revertedWith("TRANSFER_FAILED");
        });

        it("Withdraw: Success", async () => {
            await dai.mint(investor.address, daiDecimals.mul(100000));
            await dai
                .connect(investor)
                .approve(claim.address, daiDecimals.mul(100000));
            await claim.toggleSaleStatus();
            await claim.setAddressToInvestorWhitelist(
                investor.address,
                gradDecimals.mul(1 * 1e6)
            );

            await claim
                .connect(investor)
                .buyInvestorsAllocation(
                    investor.address,
                    gradDecimals.mul(1 * 1e6)
                );

            await claim
                .connect(deployer)
                .withdraw(
                    deployer.address,
                    dai.address,
                    daiDecimals.mul(1 * 1e4)
                );

            const balance = await dai.balanceOf(deployer.address);
            expect(balance).to.be.equal(daiDecimals.mul(1 * 1e4));
        });
    });
});
