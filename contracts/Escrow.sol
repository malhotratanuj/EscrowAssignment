// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract Escrow {
    address public arbiter;
    address public beneficiary;
    address public depositor;

    bool public isApproved;
    uint public unlockTime;

    constructor(address _arbiter, address _beneficiary) payable {
        arbiter = _arbiter;
        beneficiary = _beneficiary;
        depositor = msg.sender;
    }

    event Approved(uint);
    event ContractDeleted(address indexed _address);

    function approve() external {
        require(msg.sender == arbiter);
        require(!isApproved, "Contract already approved");
        
        uint balance = address(this).balance;
        (bool sent, ) = payable(beneficiary).call{value: balance}("");
        require(sent, "Failed to send Ether");
        
        emit Approved(balance);
        isApproved = true;
    }

    function deleteContract() external {
        require(msg.sender == arbiter || msg.sender == depositor, "Only arbiter or depositor can delete the contract");
        require(!isApproved, "Cannot delete contract after approval");
        
        emit ContractDeleted(address(this));
        payable(depositor).transfer(address(this).balance);
    }

    function setTimelock(uint _unlockTime) external {
        require(msg.sender == arbiter, "Only arbiter can set timelock");
        unlockTime = _unlockTime;
    }

    function withdraw() external {
        require(isApproved, "Contract not approved yet");
        require(block.timestamp >= unlockTime, "Timelock not expired");

        uint balance = address(this).balance;
        (bool sent, ) = payable(beneficiary).call{value: balance}("");
        require(sent, "Failed to send Ether");
    }
}
