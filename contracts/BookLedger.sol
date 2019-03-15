
pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";

/**
 * This contract inherits from ERC721
 */
contract BookLedger is ERC721 {
  string public constant contractName = 'BookLedger'; // For testing.

  event ledgerCreated(address book);
  
  struct Book {
    uint256 timeOfBirth;
    string name; 
  }

  address public _minter;
  uint256 public _startBalance;


  mapping(uint256 => uint256) internal _entity;

  constructor(
    address minter,  //accounts[5] name?
    uint256 startBalance
  ) public {
      _minter = minter;
      _startBalance = startBalance;
  }

  modifier onlyMinter() {
    require(msg.sender == _minter, "msg.sender is not _minter.");
    _;
  }

  function getOwner(uint256 entityID)
    external view returns(uint256)
  {
    return _entity[entityID];
  }

}
