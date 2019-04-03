
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
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _bookTransmission;

  address public _minter;
  uint256 public _startBalance;
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

    function isBookInTransmission( address sender, address reciever, uint256 bookID ) public exists(bookID) view returns(bool)
    {
      return _bookTransmission[sender][reciever][bookID];
    }

    function isBookCommitted ( address sender, address reciever, uint256 bookID ) public exists(bookID) view returns(bool)
    {
      return _committed[sender][reciever][bookID];
    }
  /**
   * Remove book from the library
   * @param bookID The unique ID of the book in the library.
   */
   function removeBook( address owner, uint256 bookID ) public exists(bookID) returns(bool)
   {
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
    // Return the book to the minter, or the library for our situation


    // Do know if we should handle local book returns in this function, or make
    // it so the library have to go through the process of accepting the book
    // back into the library.
  }
  /**
    * Signal that the book has physically been returned to the library
    */
   function archiveBook( address oldOwner, uint256 bookID ) exists(bookID) public
   {
     // Only the library should be able to place the book back into the archive
     requires(msg.sender == _minter);
     // The current owner of the book should not be the same as the library.
     // The library should be
     requires(msg.sender != oldOwner);
     //
     acceptBook (oldOwner, _minter, bookID);
   }
  /**
   *  Request book from the library.
   */
   function requestBook ( address newOwner, uint256 bookID ) exists(bookID) public
   {
     // You should not be able to request a book that you are the owner of
     requires(msg.sender == newOwner);
     // The library should not be able to request book back from itself.
     requires(_minter != msg.sender);
     // The book should not be in transmission or currently commited to an
     // transaction.
     requires(!isBookCommitted(_minter,newOwner,bookID);
     requires(!isBookInTransmission(_minter,newOwner,bookID));
     // The book should currently be in the possesion of the library
   }
  /**
    * Accept that the book is currntly in your possesion. Check how the book
    * should being transfered, then handle accepting the book based off this
    * information.
    */
    function acceptBook ( address sender, address reciever, uint256 bookID ) exists(bookID) public
    {
      // The person recieving the book should be the only one who should be able
      // to accept the book.
      requires(msg.sender == reciever);
      // Check to make sure the book is in the process of being transfer between the
      // two users.
      requires(isBookCommitted(sender,reciever,bookID);
      requires(isBookInTransmission(sender,reciever,bookID));
      // A user should not be able to transferbook to themself
      requires(sender != reciever);
      // After the book is accepted, transfer ownership of the book
      transferBook(sender, reciever, bookID );
      // After books have been succefully accepted, reset mappings to false
      _committed[sender][reciever][bookID] = false;
      _bookTransmission[sender][reciever][bookID] = false;
    }
    /**
      * Trade Book. Trade book will allow one user to trade books with another
      * user without resubmitting the book to the library. This function should
      * initiate the transaction and the independent needs to confirm when they
      * have recieved the book.
      */
    function tradeBook ( address owner1, uint256 bookID1, address owner2, uint256 bookID2) exists(bookID) public
    {
      // Make sure books are not currntly in the process of being transfered to
      // anyone else before making trade.
      requires(_committed[owner1][owner2][bookID1] == false);
      requires(_bookTransmission[owner1][owner2]bookID1] == false);
      requires(_committed[owner2][owner1][bookID2] == false);
      requires(_bookTransmission[owner2][owner1]bookID2] == false);
      // Set books as being prompted for transmission
      _committed[owner1][owner2][bookID1] = true;
      _committed[owner2][owner1][bookID2] = true;
    }
    /**
      * Transfer Book. transfer book will allow one user to trade books with another
      * user without resubmitting the book to the library. This function should
      * initiate the transaction and the independent needs to confirm when they
      * have recieved the book.
      */
    function transferBook ( address sender, address reciever, uint256 bookID ) exists(bookID) public
    {
      // Transfer the book token to the new owner of the book.
      transferFrom(sender,reciever,bookID);
      // Update book ownership mappings
    }
  /**
    * If a book is lost in transmission or by the user, this function should be called
    * to clear out any transaction information for the given book. Once this
    * information is cleared, the book is then burned and removed from the
    * library blockchain.
    */
    function lostBook ( address owner, uint256 bookID ) exists(bookID) public
    {
      // Cannot lose the same book twice, so will not allow the book to
      // be re added to the lost book list.
       requires(_lostBooksList[bookID] != _books[owner][bookID]);
       _lostBooksList[bookID] = _books[owner][bookID];
        removeBook( owner, bookID );
    }

  /**
    * Commit to removing book from the library ledger or began transfering book
    * to another user. The only one who can make the commitment of the book
    * is the owner of the book.
    */
    function setBookInTransmission ( address sender, address reciever, uint256 bookID ) exists(bookID) public
    {
      // The send of the book should be the only one able to send the book.
      requires(sender == msg.sender);
      // The book must already be committed.
      requires(_committed[sender][reciever][bookID] == true);
      // The book should not already be marked as in transmission.
      requires(_bookTransmission[sender][reciever][bookID] == false);
      _bookTransmission[sender][reciever][bookID] == true;
    }
}
