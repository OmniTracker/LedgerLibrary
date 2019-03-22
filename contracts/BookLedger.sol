
pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";

/**
 * This contract inherits from ERC721

Every User/address/entity has a library of books. Calling this contract is equivalent to creating their own library.

 */
contract BookLedger is ERC721 {
  string public constant contractName = 'BookLedger'; // For testing.

  event ledgerCreated(address book);
  event entityInitialized(address owner);  
  event bookRemoved();
  event bookAdded(string publisher, string author, string name );
  event bookRemoved(string publisher, string author, string name );

  struct Book {
    uint256 bookID;
    uint256 bookPointer;    
    uint256 timeOfOrigin;
    uint256 timeOfRental;
    bool availability;
    uint256 genre;
    string country;
    string publisher;
    string author;
    string name;
  }


  address[] public _entity;
  
  mapping(address => mapping(uint256 => Book)) _books; // index books by entity address and bookID
  mapping(address => uint256[]) _booksList;

  address public _minter;
  uint256 public _startBalance;
  uint256 public _rentalInterval;


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
      require(_exists(bookID), "ERC721 token exists for book with specified ID does not exist.");
    _;
  }

  
  /**
   * Mint new book to library
     May want when creating a book to make a hash of the concat of some of the properties of the book for sharing
   */
   function newBook ( address owner,
		      uint256 bookID,
                      uint256 genre,
                      string country,
                      string publisher,
                      string author,
                      string name )
      public onlyMinter returns(uint256)
   {
     Book memory book = Book({
       bookID: bookID,
       bookPointer: 0,
       timeOfOrigin: now,
       timeOfRental: 0,
       availability: true,
       genre: genre,
       country: country,
       publisher: publisher,
       author: author,
       name: name
	 });

     uint256 bookPointer = _booksList[owner].push(bookID) - 1;
     book.bookPointer = bookPointer;
     _books[owner][bookID] = book;
     /* Mint new book to the library */
     _mint(owner, bookID);

     emit bookAdded(_books[owner][bookID].publisher, _books[owner][bookID].author, _books[owner][bookID].name );
     return bookID;
   }


   /**
    * Get origin date of book being placed in library.
    */

   function originDateOfBook ( address owner, uint256 bookID )
      external exists(bookID) view returns(uint256)
    {
	return _books[owner][bookID].timeOfOrigin;
    }

   /**
    * Get number of books in Library
    */
    function numberOfBookInLibraray ( address owner ) public view returns(uint256) {
      return _booksList[owner].length;
    }

   /**
    * Get the availability of book from library.
    */
    function isBookAvailable( address owner, uint256 bookID ) public exists(bookID) view returns(bool)
    {
      return _books[owner][bookID].availability;
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
   function removeBook( address owner, uint256 bookID ) public exists(bookID) returns(bool) {
       //require( isBookAvailable( owner, bookID ) );
     Book memory book = _books[owner][bookID];
     // Commit to taking the book out the Library
     //commitBookRemoval(bookID);
     // Set the book as unavailable
       //book.availability = false;
     // Set the time of rental
     //book.timeOfRental = now;
     emit bookRemoved( book.publisher, book.author, book.name );

     // remove book from book list by swapping with last element in list
     // and update swapped book's pointer in book mapping
     uint256 rowToDelete = _books[owner][bookID].bookPointer;
     uint256 keyToMove = _booksList[owner][_booksList[owner].length-1];
     _booksList[owner][rowToDelete] = keyToMove;
     _books[owner][keyToMove].bookPointer = rowToDelete;
     _booksList[owner].length--;
     _burn(owner, bookID);
     
     return true;
   }

 /**
  * Place book back into the library
  */
  function returnBook( uint256 bookID ) exists(bookID) public {

  }

  /**
   * Renew library book subscription
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
