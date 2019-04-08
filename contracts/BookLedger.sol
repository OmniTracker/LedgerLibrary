
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
  event archivingBook(string publisher, string author, string name );
  event setBookToLost(string publisher, string author, string name );
  //event bookReportedLost(string publisher, string author, string name );
  event bookReportedLost(bool bookLost, uint256 bookID);
  event bookInTransmission(string publisher, string author, string name );
  event escrowCommitted(address newOwner, uint256 escrowAmount );
  event bookReceived(bool transmissionComplete, string bookCondition );

  event people(address msgSender, address owner);
  event bookInTransmissionS2(address currentOwner, address tempOwner, uint256 bookID, bool InTransmission );

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
    bool exist;
  }

  address[] public _entity;
  address private _wallet; //wallet address set to minter.. Should be the contracts address

  // index books by entity address and bookID
  mapping(address => mapping(uint256 => Book)) internal _books;
  // _booksList contains a list of all books owned by an entity
  // _lostBooksList contains a mapping of all the lost books in the universe
  mapping(address => uint256[]) internal _booksList;
  mapping(uint256 => bool) internal _lostBooksList;

  // Commit books for user. The indexing for this structure corresponds to the
  // address of the sender, receiver of the book, and the book ID
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _committed;
  // Will hold the transmission status of a book corresponding to the sender, receiver, and bookID
  // The book needs to be commited for transmission and the status must be updated
  // corresponding to how the book is being transmitted.
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _bookTransmission;

  // determine escrow amount for book trade or rent. is internal necessary for all of these?
  // contract holds escrow for each address
  mapping(address => mapping(address => mapping(uint256 => uint256))) public _bookEscrow;
  mapping(address => uint256) internal _contractEscrow;

  address public _minter;
  uint256 public _startBalance;
  constructor(
    address minter,
    uint256 startBalance
  ) public {
      _minter = minter;
      _wallet = minter;
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
       bookPossession: "",
       genre: genre,
       country: country,
       publisher: publisher,
       author: author,
       name: name,
       exist: true
	 }); // also initialized with exist: true
     
     uint256 bookPointer = _booksList[owner].push(bookID) - 1;
     book.bookPointer = bookPointer;
     _books[owner][bookID] = book;
     // Flag to signal that a book currenly exist in a mapping. Solidity initialize
     // all data to zero, so if we were to delete book from a mapping, this would
     // be the easiest way to make this check because this value will be set to
     // zero, or false, if it doesn't exist in the mapping.
     //_books[owner][bookID].exist = true;  // established as true in initialized Book
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
    function numberOfBookInLibrary ( address owner ) public view returns(uint256)
    {
        return _booksList[owner].length;
    }
   /**
    * Get the availability of book from library.
    */
    function isBookAvailable( address owner, uint256 bookID )
    public exists(bookID) view returns(bool)
    {
        return _books[owner][bookID].availability;
    }
    function isBookInTransmission( address sender, address receiver, uint256 bookID )
    public exists(bookID) view returns(bool)
    {
      return _bookTransmission[sender][receiver][bookID];
    }
    function isBookCommitted ( address sender, address receiver, uint256 bookID )
    public exists(bookID) view returns(bool)
    {
      return _committed[sender][receiver][bookID];
    }
    function bookEscrow ( address owner, address requester, uint256 bookID ) public view returns(uint256)
    {
      return _bookEscrow[owner][requester][bookID];
    }
    function accountEscrow ( address requester ) public view returns(uint256)
    {
      return _contractEscrow[requester];
    }
    function transmissionStatus( address owner, address requester, uint256 bookID ) public view returns(bool)
    {
      return _bookTransmission[owner][requester][bookID];
    }
	
    function bookExistInMapping ( address owner, uint256 bookID) view returns(bool)
    {
      return _books[owner][bookID].exist;
    }

  /**
   * Remove book from the library
   * @param bookID The unique ID of the book in the library.
   */
   function removeBook( address owner, uint256 bookID )
   public exists(bookID) returns(bool)
   {
     // The only one who should be able to remove a book is the library or the
     // owner of the book
     require( msg.sender == owner || msg.sender == _minter);
     require(_books[owner][bookID].exist);

     // remove book from book list by swapping with last element in list
     // and update swapped book's pointer in book mapping
     uint256 rowToDelete = _books[owner][bookID].bookPointer;
     uint256 keyToMove = _booksList[owner][_booksList[owner].length-1];


     _booksList[owner][rowToDelete] = keyToMove;
     _books[owner][keyToMove].bookPointer = rowToDelete;
     _booksList[owner].length--;

     // Delete the book from the _books mapping. We don't need this information
     // since the book has been removed from circulation.
     delete _books[owner][bookID];

     _burn(owner, bookID);
     return true;
   }
 /**
  * Place book back into the library. This function should commit the book. Once
  * the book has started the process of being sent, it is up to the library to
  * accept the book. The person who is currently holding the book should set the
  * book to being in transmission to signal that the book has been release from
  * their possesion. At this point, the mapping for the book for the library should
  * be empty and the book should be mapped as being in the possesion of the person
  * returning the book.
  */
  function returnBook( address owner, uint256 bookID ) exists(bookID) public
  {
    // The current owner of the book should be the only one able to return the
    // book.
    require(owner == msg.sender);
    // The library cannot return a book to itself.
    require(_minter != msg.sender);
    // Book should not be commit to any transaction before attempting to return
    // the book.
    require(!isBookCommitted(owner, _minter, bookID));
    require(!isBookInTransmission(owner, _minter,bookID));
    // Ensure book is not in the library already.
    require( _books[owner][bookID].exist );
    // Require that book has isn't currently available, since the book is not
    // currently in the library, this flag should have been set to false somewhere
    // else in the application.
    require(!isBookAvailable(owner,bookID));
    // Set the book as being committed in a transaction.
    _committed[owner][_minter][bookID] = true;
  }
  /**
    * Signal that the book has physically been returned to the library. The library
    * should provide the address to the former owner of the book then adjust the
    * mapping associated with this book and the former owner. The previous owner,
    * of the book should not be allowed to archive the book back into the library.
    * Before this function call is made, the book should have already gone through
    * the transmission process to signal that it has travelled back to the library.
    */
   function archiveBook( address oldOwner, uint256 bookID ) exists(bookID) public
   {
     // Only the library should be able to place the book back into the archive
     require(msg.sender == _minter);
     // The current owner of the book should not be the same as the library.
     // The library should be
     require(msg.sender != oldOwner);
     //
     acceptBook (oldOwner, _minter, bookID);


   }
  /**
   *  Request book from the library.
      msg.sender is the entity requesting to trade or checkout a book
      owner is the current owner of the book; the library
      If all statements pass, LibraryApp will contact owner that 
      msg.sender is requesting a book
   */
   function requestBook ( address owner, uint256 bookID ) exists(bookID) public
   {

     emit people( msg.sender, owner);
     // You should not be able to request a book that you are the owner of
     //require( !_books[msg.sender][bookID].exist );

     // The requester should not be able to request a book from itself
     //require( msg.sender != owner );

     // The book should currently be in the possesion of the library
     //require( _books[msg.sender][bookID].exist );

     // The book should not be in transmission or currently committed to an
     // transaction.
     //require( !isBookCommitted( msg.sender, owner, bookID ));
     //require( !isBookInTransmission( msg.sender, owner, bookID ));

   }

   /**
      Sender establishes an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
    */
   function commitBook ( address sender, address receiver, uint256 bookID, uint256 escrow ) exists(bookID) public {

       _bookEscrow[sender][receiver][bookID] = escrow;
       _committed[sender][receiver][bookID] = true;
       
   }
   
   /**
      Sender commits an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
    */
   function commitEscrow ( address sender, address receiver, uint256 bookID, uint256 escrow ) public {

       _contractEscrow[receiver] = escrow;
       _committed[receiver][sender][bookID] = true;       

       emit escrowCommitted( receiver, escrow );
       
   }
   
  /**
    * Accept that the book is currently in your possesion. Check how the book
    * should being transfered, then handle accepting the book based off this
    * information.
    */
    function acceptBook ( address sender, address receiver, uint256 bookID ) exists(bookID) public
    {
      // The person recieving the book should be the only one who should be able
      // to accept the book.
      require(msg.sender == receiver);

      // Check to make sure the book is in the process of being transfer between the
      // two users.
      require(isBookCommitted(sender,receiver,bookID));
      require(isBookInTransmission(sender,receiver,bookID));

      // A user should not be able to transferbook to themself
      require(sender != receiver);

      // After the book is accepted, transfer ownership of the book
      transferBook(sender, receiver, bookID );

      // After books have been succefully accepted, reset mappings to false
      _committed[sender][receiver][bookID] = false;
      _bookTransmission[sender][receiver][bookID] = false;

      // If the receiver of the book is equal to the minter, the book availability
      // can then be marked so signal that book can be removed from the library
      // again.
      if (receiver == _minter)
      {
        _books[receiver][bookID].exist = true;
      }
    }

    /** Checkout book
	trade a book without changing ownership
	Once both have committed, the currentOwner must ship the book the the temporary owner

	currentOwner: owns bookID
	tempOwner: temporary owner of bookID
     */
    function checkoutBook ( address currentOwner, address tempOwner, uint256 bookID ) exists(bookID) public {

      // the temporary owner checking out the book should have an escrow being held
      // by the contract greater than or equal to the book value set by the current
      // owner
      require( _contractEscrow[tempOwner] >= _bookEscrow[currentOwner][tempOwner][bookID]);

      // both the current owner and new owner should have committed
      require( _committed[currentOwner][tempOwner][bookID] );
      require( _committed[tempOwner][currentOwner][bookID] );

      _bookTransmission[currentOwner][tempOwner][bookID] = true;

      emit bookInTransmissionS2( currentOwner, tempOwner, bookID, true );
    }

    /** acceptBook
      * book has been shipped and received by new or tempOwner
      */
    function acceptBookS2( address currentOwner, address newOwner, uint256 bookID, string condition ) exists(bookID) {

	// book no longer in transmission
      _bookTransmission[currentOwner][newOwner][bookID] = false;

      emit bookReceived( true, condition );
    }
    
    /**
      * Trade Book. Trade book will allow one user to trade books with another
      * user without resubmitting the book to the library. This function should
      * initiate the transaction.
      */
    function tradeBook ( address owner1, uint256 bookID1, address owner2, uint256 bookID2) exists(bookID1) exists(bookID2) public
    {
      // Make sure books are not currntly in the process of being transfered to
      // anyone else before making trade.
      require(_committed[owner1][owner2][bookID1] == false);
      require(_bookTransmission[owner1][owner2][bookID1] == false);
      require(_committed[owner2][owner1][bookID2] == false);
      require(_bookTransmission[owner2][owner1][bookID2] == false);

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
    function transferBook ( address sender, address receiver, uint256 bookID ) exists(bookID) public
    {
      // Transfer the book token to the new owner of the book.
      transferFrom(sender,receiver,bookID);
      // Update book ownership mappings
    }
    
  /**
    * If a book is lost in transmission or by a user, this function should be called
    * to clear out any transaction information for the given book. Once this
    * information is cleared, the book is then burned and removed from the
    * library blockchain.
    */
    function lostBook ( address owner, uint256 bookID ) exists(bookID) public
    {
       // Require the book exist in the first place before it is reported lost
       require( _books[owner][bookID].exist );

      // Cannot lose the same book twice, so will not allow the book to
      // be re added to the lost book list.
       require( !_lostBooksList[bookID] );
       
       // Set the book as lost
       _lostBooksList[bookID] = true;

       // Remove the book from circulation.
       removeBook( owner, bookID );

       // Broadcast that the book has been lost and added to the lost book queue
       emit bookReportedLost(true, bookID);
    }

  /**
    * Commit to removing book from the library ledger or began transfering book
    * to another user. The only one who can make the commitment of the book
    * is the owner of the book.
    */
    function setBookInTransmission ( address sender,
                                     address receiver,
                                     uint256 bookID )
                                     exists(bookID) public
    {
      // The send of the book should be the only one able to send the book.
      require(sender == msg.sender);

      // The book must already be committed.
      require(isBookCommitted(sender, receiver, bookID));

      // The book should not already be marked as in transmission.
      require(!isBookInTransmission( sender, receiver, bookID ) );

      // The book should exist in the mapping for the given user before allowing
      // book to begin transmission.
      require(_books[sender][bookID].exist);

      // Set book in transmission flag to signal that the book is currently
      // travaling to it designated location.
      _bookTransmission[sender][receiver][bookID] == true;

      // If the sender of this message is equal to the _minter or the library,
      // then set the book as not available.
      if ( sender == _minter)
      {
        _books[sender][bookID].availability = false;
      }

      // Emit signal book is currently in transmission
      emit bookInTransmission(_books[sender][bookID].publisher,
                              _books[sender][bookID].author,
                              _books[sender][bookID].name);
    }
}
