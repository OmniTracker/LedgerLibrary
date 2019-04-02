
pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";

/**
 * This contract inherits from ERC721

Every User/address/entity has a library of books. Calling this contract is
equivalent to creating their own library.

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
    bool availability;
    string bookPossession;
    uint256 genre;
    string country;
    string publisher;
    string author;
    string name;
  }

  struct BookTransmission {
    string status;
  }

  address[] public _entity;

  // index books by entity address and bookID
  mapping(address => mapping(uint256 => Book)) internal _books;
  // index books lost by bookID. An address is no longer needed because the
  // book is lost
  mapping(uint256 => Book) internal _lostBooksList;
  mapping(address => uint256[]) internal _booksList;

  // Commit books for user. The indexing for this structure corresponds to the
  // address of the sender, reciever of the book, and the book ID
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _committed;

  // Will hold the transmission status of a book corresponding to the sender, reciever, and bookID
  // The book needs to be commited for transmission and the status must be updated
  // corresponding to how the book is being transmitted.
  mapping(address => mapping(address => mapping(uint256 => BookTransmission))) internal _bookTransmission;

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
     May want when creating a book to make a hash of the concat of some of the
     properties of the book for sharing
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
     emit bookAdded(_books[owner][bookID].publisher, _books[owner][bookID].author, _books[owner][bookID].name);
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
   * Remove book from the library
   * @param bookID The unique ID of the book in the library.
   */
   function removeBook( address owner, uint256 bookID ) public exists(bookID) returns(bool) {
     Book memory book = _books[owner][bookID];
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
  * Place book back into the library. This function should commit the book
  * and mark that it is being transfer.
  */
  function returnBook( address owner, uint256 bookID ) exists(bookID) public
  {


  }
  /**
    * Signal that the book has physically been returned to the library
    */
   function archiveBook( address owner, uint256 bookID ) exists(bookID) public
   {
     // Only the library should be able to place the book back into the archive

   }
  /**
   *  Request book from the library.
   */
   function requestBook ( address owner, uint256 bookID ) exists(bookID) public
   {
     // You should not be able to request a book that you are the owner of
     requires(msg.sender != owner);

   }
  /**
    * Accept that the book is currntly in your possesion. Check how the book
    * should being transfered, then handle accepting the book based off this
    * information.
    */
    function acceptBook ( address sender, address reciever uint256 bookID ) exists(bookID) public
    {

    }
    /**
      * Trade Book. Trade book will allow one user to trade books with another
      * user without resubmitting the book to the library. This function should
      * initiate the transaction and the independent needs to confirm when they
      * have recieved the book.
      */
    function tradeBook ( address owner1, uint256 bookID1, address owner2, uint256 bookID2 ) exists(bookID) public
    {

    }
    /**
      * Transfer Book. transfer book will allow one user to trade books with another
      * user without resubmitting the book to the library. This function should
      * initiate the transaction and the independent needs to confirm when they
      * have recieved the book.
      */
    function transferBook ( address owner, address reciever, uint256 bookID ) exists(bookID) public
    {

    }
  /**
    * If a book is lost in transmission or by the user, this function should be called
    * to clear out any transaction information for the given book. Once this
    * information is cleared, the book is then burned and removed from the
    * library blockchain.
    */
    function lostBook ( address owner, uint256 bookID ) exists(bookID) public
    {
      // Can not lose the same book twice, so will not allow the book to
      // be re added to the lost book list.
       requires(_lostBooksList[bookID] != _books[owner][bookID]);
       // Only the

       Book memory book = _books[owner][bookID];
        _lostBooksList[bookID] = book;
        removeBook( owner, bookID );
    }

  /**
    * Commit to removing book from the library ledger or began transfering book
    * to another user. The only one who can make the commitment of the book
    * is the owner of the book.
    */
    function commitBook ( address sender, address reciever uint256 bookID ) exists(bookID) public
    {
      // Only the library should be able to remove the book from this place.
      requires(owner == msg.sender);
      Book memory book = _books[owner][bookID];

    }
}
