
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
  uint256 public _rentalInterval;

  mapping(uint256 => uint256) internal _entity;

  constructor(
    address minter,
    uint256 startBalance,
    uint256 rentalInterval
  ) public {
      _minter = minter;
      _startBalance = startBalance;
      _rentalInterval = rentalInterval;
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

  /**
   * Set minter of book into library
   */


   /**
    * Get origin date of book being placed in library.
    */

    function originDateOfBook (uint256 bookID )
      external exists(bearID) view returns(uint256)
    {

    }

   /**
    * Get number of books in Library
    */
    function numberOfBookInLibraray () public view returns(uint256) {

    }

   /**
    * Get the availability of book from library.
    */
    function isBookAvailable() public view returns(bool)
    {

    }

  /**
   * Commit to removing book from the library ledger
   */
   function commitBookRemoval ( uint256 bookID ) public {

   }

  /**
   * Remove book from the library
   */
   function removeBook( uint256 bookID ) public {

   }

 /**
  * Place book back into the library
  */
  function placeBook( uint256 bookID ) public {

    }

  /**
   * Renew library book subscribtion
   */
   function renewBookRental( uint256 bookID ) public {

   }

  /**
   * Get date of book removal from library
   */
   function getDateOfBookRemoval( uint256 bookID )
      external exists( bookID ) view return(uint256)
    {

    }

   /**
    * Get date when book needs to be submitted back to library
    */
    function returnTimeOfBook ( uint256 bookID )
      external exists( bookID ) view return(uint256)
    {

    }

}
