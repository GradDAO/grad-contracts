// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../libraries/SafeERC20.sol";
import "../types/Ownable.sol";
import "../interfaces/IClaim.sol";


/**
 *  This contract allows seed investors, advisers and the team to claim tokens.
 *  Current functionality of the contract merely allows to set terms of future vesting.
 *  Thus, it has a functionality not for redeeming but for buying and setting shares of seed investors and genesis team.   
 */
contract Claim is Ownable {
    /* ========== DEPENDENCIES ========== */

    using SafeERC20 for IERC20;

    /* ========== STRUCTS ========== */

    struct Term {
        uint256 percent; // 4 decimals ( 5000 = 0.5% )
        uint256 gClaimed; // rebase-agnostic number
        uint256 max; // maximum nominal GRAD amount can claim (9 decimals)
        uint256 claimer; // type of claimer (0 - team, 1 - investor, 2 - adviser)
    }
    
    struct Claimers {
        uint256 team;
        uint256 investors;
        uint256 advisers;
    }

    /* ========== STATE VARIABLES ========== */

    // payment token
    IERC20 internal immutable dai = IERC20(address(0));
    // previous deployment of contract (to migrate terms). It's the first version
    IClaim internal immutable previous = IClaim(address(0));

    // tracks address info
    mapping(address => Term) public terms;
    // facilitates address change
    mapping(address => address) public walletChange;
    // maximum portion of supply can allocate (10% team, 5% investors, 3% advisers) (4 decimals)
    Claimers public maximumAllocatedPercents = Claimers(10 *1e4, 5 *1e4, 3 *1e4);
    // maximum amount of GRAD can allocate (330mm team, 70mm investors, 50mm advisers) (9 decimals)
    Claimers public maximumAllocatedTokens = Claimers(330*1e6 *1e9, 70*1e6 *1e9, 50*1e6 *1e9);
    // current allocated percents
    Claimers public totalAllocatedPercents = Claimers(0, 0, 0);
    // current allocated GRADs
    Claimers public totalAllocatedTokens = Claimers(0, 0, 0);

    bool public saleOpened; // open sale
    mapping(address => uint256) public saleWhitelist; // sale whitelist (amount for each address)
    uint256 public gradPrice; // 4 decimals ($1 = 10000)


    constructor(uint256 _gradPrice) {
        gradPrice = _gradPrice;
    }


    /* ========== CLAIMERS FUNCTIONS ========== */


    /**
     * @notice allows address to push terms to new address
     * @dev 
     * @param _address address to send allocation
     * @param _amount amount of GRAD to buy
     */
    function buyAllocation(address _address, uint256 _amount) external {
        require(saleOpened, "Sale is closed");
        require(saleWhitelist[msg.sender] != 0, "Address is not whitelisted");
        require(saleWhitelist[msg.sender] >= _amount, "Cannot buy more than allowed");

        saleWhitelist[msg.sender] -= _amount;

        uint256 percent_ = getShare(_amount, maximumAllocatedTokens.investors, maximumAllocatedPercents.investors);

        require(totalAllocatedPercents.investors + percent_ <= maximumAllocatedPercents.investors, "Cannot allocate more percents");
        require(totalAllocatedTokens.investors + _amount <= maximumAllocatedTokens.investors, "Cannot allocate more tokens");

        dai.safeTransferFrom(msg.sender, address(this), (_amount * gradPrice) / 1e4); 

        totalAllocatedPercents.investors += percent_;
        totalAllocatedTokens.investors += _amount;

        terms[_address] = Term({
            percent: terms[_address].percent + percent_, 
            gClaimed: 0, 
            max: terms[_address].max + _amount, 
            claimer: 1
        }); 
    }


    /* ========== MUTABLE FUNCTIONS ========== */


    /**
     * @notice allows address to push terms to new address
     * @param _newAddress address
     */
    function pushWalletChange(address _newAddress) external {
        require(terms[msg.sender].percent != 0, "No wallet to change");
        walletChange[msg.sender] = _newAddress;
    }

    /**
     * @notice allows new address to pull terms
     * @param _oldAddress address
     */
    function pullWalletChange(address _oldAddress) external {
        require(walletChange[_oldAddress] == msg.sender, "Old wallet did not push");
        require(terms[msg.sender].percent == 0, "Wallet already exists");

        walletChange[_oldAddress] = address(0);
        terms[msg.sender] = terms[_oldAddress];
        delete terms[_oldAddress];
    }


    /* ========== OWNER FUNCTIONS ========== */

    /**
     * @notice toggle sale status
     */
    function toggleSaleStatus() external onlyOwner returns(bool) {
        saleOpened = !saleOpened;
        return saleOpened;
    }

    /**
     * @notice change GRAD price ($1 = 10000)
     * @param _newPrice new price for GRAD (4 decimals)
     */
    function changeGradPrice(uint256 _newPrice) external onlyOwner {
        gradPrice = _newPrice;
    }

    /**
     * @notice add, remove or change members of whitelist
     * @param _address address
     * @param _amount amount of GRAD allowed to buy
     */
    function setWhitelist(address _address, uint256 _amount) external onlyOwner {
        saleWhitelist[_address] = _amount;
    }

    /**
     * @notice withdraw dai
     * @param _to address to withdraw
     * @param _amount amount to withdraw
     */
    function withdraw(address _to, uint256 _amount) external onlyOwner {
        dai.safeTransfer(_to, _amount);
    }

    /**
     *  @notice set a term for a team member
     *  @dev can be changed by the owner
     *  @param _address address
     *  @param _percent uint256
     *  @param _max uint256
     */
    function setTeamTerm(
        address _address,
        uint256 _percent,
        uint256 _max
    ) public onlyOwner {
        require(totalAllocatedPercents.team - terms[_address].percent + _percent <= maximumAllocatedPercents.team, "Cannot allocate more percents");
        require(totalAllocatedTokens.team - terms[_address].max + _max <= maximumAllocatedTokens.team, "Cannot allocate more tokens");
        
        totalAllocatedPercents.team = totalAllocatedPercents.team + _percent - terms[_address].percent;
        totalAllocatedTokens.team = totalAllocatedTokens.team + _max - terms[_address].max;

        terms[_address] = Term({percent: _percent, gClaimed: 0, max: _max, claimer: 0});
    }

    /**
     *  @notice set a term for an investor
     *  @dev cannot be changed by the owner
     *  @param _address address
     *  @param _percent uint256
     *  @param _max uint256
     */
    function setInvestorTerm(
        address _address,
        uint256 _percent,
        uint256 _max
    ) public onlyOwner {
        require(terms[_address].max == 0, "Cannot change an investor's allocation");
        require(totalAllocatedPercents.investors + _percent <= maximumAllocatedPercents.investors, "Cannot allocate more percents");
        require(totalAllocatedTokens.investors + _max <= maximumAllocatedTokens.investors, "Cannot allocate more tokens");

        totalAllocatedPercents.investors += _percent;
        totalAllocatedTokens.investors += _max;
        terms[_address] = Term({percent: _percent, gClaimed: 0, max: _max, claimer: 1});
    }

    /**
     *  @notice set a term for an adviser
     *  @dev can be changed by the owner
     *  @param _address address
     *  @param _percent uint256
     *  @param _max uint256
     */
    function setAdviserTerm(
        address _address,
        uint256 _percent,
        uint256 _max
    ) public onlyOwner {
        require(totalAllocatedPercents.advisers - terms[_address].percent + _percent <= maximumAllocatedPercents.advisers, "Cannot allocate more percents");
        require(totalAllocatedTokens.advisers - terms[_address].max + _max <= maximumAllocatedTokens.advisers, "Cannot allocate more tokens");
        
        totalAllocatedPercents.advisers = totalAllocatedPercents.advisers + _percent - terms[_address].percent;
        totalAllocatedTokens.advisers = totalAllocatedTokens.advisers + _max - terms[_address].max;

        terms[_address] = Term({percent: _percent, gClaimed: 0, max: _max, claimer: 2});
    }


    /* ========== PUBLIC FUNCTIONS ========== */


    /**
     * @notice value2_ is such share of _amount2 as _value1 is of _amount1
     * @param _value1 uint256
     * @param _amount1 uint256
     * @param _amount2 uint256
     * @param value2_ uint256
     */
    function getShare(
        uint256 _value1, 
        uint256 _amount1, 
        uint256 _amount2
    ) public pure returns (uint256 value2_) {
        value2_ = (_value1 * _amount2) / _amount1;
    }
}
