// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "../libraries/SafeERC20.sol";
import "../types/Ownable.sol";

interface IClaim {
    struct Term {
        uint256 percent; // 4 decimals ( 5000 = 0.5% )
        uint256 gClaimed; // static number
        uint256 max; // maximum nominal GRAD amount can claim
        uint256 claimer;
    }

    struct Claimers {
        uint256 team;
        uint256 investors;
        uint256 advisers;
    }

    function terms(address _address) external view returns (Term memory);
}
