
pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";

/**
 * This contract inherits from ERC721
 */
contract BookLedger is ERC721 {
  string public constant contractName = 'BookLedger'; // For testing.

  event ledgerCreated(address book);
  event bookRemoved();
  event bookAdded(string publisher, string author, string name );
  event bookRemoved(string publisher, string author, string name );

  struct Book {
    uint256 timeOfOrigin;
    uint256 timeOfRental;
    bool availability;
    uint256 genre;
    string country;
    string publisher;
    string author;
    string name;
  }

  Book[] internal _books;

  address public _minter;
  uint256 public _startBalance;
  uint256 public _rentalInterval;

  mapping(uint256 => uint256) internal _entity;

  constructor(
    address minter,
    uint256 startBalance
  ) public {
      _minter = minter;
      _startBalance = startBalance;
  }

  modifier onlyMinter() {
    require(msg.sender == _minter, "msg.sender is not _minter.");
    _;
  }

  modifier exists(uint256 bookID) {
    require(_exists(bookID), "Bear with specified ID does not exist.");
    _;
  }

  function getOwner(uint256 entityID)
    external view returns(uint256)
  {
    return _entity[entityID];
  }

  /**
   * Mint new book to library
   */

   function newBook ( address owner,
                      uint256 genre,
                      string country,
                      string publisher,
                      string author,
                      string name )
      public onlyMinter returns(uint256)
   {
     Book memory book = Book({
       timeOfOrigin: now,
       timeOfRental: 0,
       availability: true,
       genre: genre,
       country: country,
       publisher: publisher,
       author: author,
       name: name
     });

     uint256 bookID = _books.push(book) - 1;
     /* Mint new book to the library */
     _mint(owner, bookID);

     emit bookAdded(_books[bookID].publisher, _books[bookID].author, _books[bookID].name );
     return bookID;
   }


   /**
    * Get origin date of book being placed in library.
    */

    function originDateOfBook ( uint256 bookID )
      external exists(bookID) view returns(uint256)
    {

    }

   /**
    * Get number of books in Library
    */
    function numberOfBookInLibraray () public view returns(uint256) {
      return _books.length;
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
   function commitBookRemoval ( uint256 bookID ) exists(bookID) public {

   }

  /**
   * Remove book from the library
   * @param bookID The unique ID of the book in the library.
   */
   function removeBook( uint256 bookID ) exists(bookID) public {
     Book storage book = _books[bookID];

     // Commit to taking the book out the Library
     commitBookRemoval(bookID);

     emit bookRemoved( book.publisher, book.author, book.name );
   }

 /**
  * Place book back into the library
  */
  function placeBook( uint256 bookID ) exists(bookID) public {

    }

  /**
   * Renew library book subscribtion
   */
   function renewBookRental( uint256 bookID ) exists(bookID) public {

   }

  /**
   * Get date of book removal from library
   */
   function getDateOfBookRemoval( uint256 bookID )
      external exists(bookID) view returns(uint256)
    {

    }

   /**
    * Get date when book needs to be submitted back to library
    */
    function returnTimeOfBook ( uint256 bookID )
      external exists(bookID) view returns(uint256)
    {

    }

}
