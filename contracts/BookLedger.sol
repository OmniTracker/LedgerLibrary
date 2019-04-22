
pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";
import "./Support/SafeMath.sol";

/**
 * This contract inherits from ERC721

Every User/address/entity has a library of books. Calling this contract is
equivalent to creating their own library.


 */
contract BookLedger is ERC721 {
  string public constant contractName = 'BookLedger';
  using SafeMath for uint256;

  event bookRequested();
  event people(address msgSender, address owner);
  event bookAdded(string publisher, string author, string name );
  event bookRemoved(string publisher, string author, string name );
  event escrowCommitted(address newOwner, uint256 escrowAmount );
  event bookInTransmission(address currentOwner, address tempOwner, uint256 bookID, bool InTransmission );
  event bookReceived(bool transmissionComplete, string bookCondition );
  event bookIsLost(bool bookLost, uint256 bookID);


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
    address holder;
  }


  address[] public _entity;
  //address private _wallet; //wallet address set to minter.. Should be the contracts address

  // index books by entity address and bookID
  mapping(address => mapping(uint256 => Book)) internal _books;
  // _booksList contains a list of all books owned by an entity
  // _lostBooksList contains a mapping of all the lost books in the universe
  mapping(address => uint256[]) internal _booksList;
  mapping(address => mapping(uint256 => bool)) internal _lostBooksList;

  // Used to check if a user have a book
  mapping(address => mapping(uint256 => bool)) _doesUserHaveBook;
  mapping(address => uint256) _userBookCount;

  // mapping for whether book will be loaned or traded
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _trade;
  
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
  uint256 public _minEscrow; // Set the min escrow number
  uint256 public _maxEscrow; // Limit the max escrow number

  uint256 public _maxBookCount; // Limit the number of books a user can take out

  constructor(
    address minter,
    uint256 minEscrow
  ) public {
      _minter = minter;
      _minEscrow = minEscrow;
      //_maxEscrow = maxEscrow;
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
       exist: true,
       holder: owner
	 });
      // Require the book id does not exist. This is the easiest way to check if
      // the book has already been added to the specified mapping
      require(!_books[owner][bookID].exist);

      // Update the placeholder bookPointer with position in owners bookList
      uint256 bookPointer = _booksList[owner].push(bookID) - 1;
      book.bookPointer = bookPointer;
      _books[owner][bookID] = book;

      /* Mint new book to the library */
      _mint(owner, bookID);

      emit bookAdded(_books[owner][bookID].publisher, _books[owner][bookID].author, _books[owner][bookID].name);
      return bookID;
   }

   /** Public view functions
    Common tests for property of book
     - book.exists
     - exists(bookID)
     - isBookAvailable(owner, bookID)
     - isBookCommitted(sender, receiver, bookID)
     - transmissionStatus(owner, requester, bookID)
     - accountEscrow(requester)
     - bookEscrow(owner, requester, bookID)
    */

   /** Get origin date of book being placed in library. */
    function originDateOfBook ( address owner, uint256 bookID )
      external exists(bookID) view returns(uint256)
    { return _books[owner][bookID].timeOfOrigin; }

    /** Get number of books in Library  */
    function numberOfBookInLibrary ( address owner )
    public view returns(uint256)
    {
      require(_minter == owner);
      return _booksList[owner].length;
    }

    /** Get number of books a user have  */
    function numberOfAUserHolds ( address owner )
    public view returns(uint256)
    {
      require(_minter != owner);
      return _userBookCount[owner];
    }

    /** Get number of books a user have  */
    function doesUserHaveBook ( address owner, uint256 bookID )
    public view returns(bool)
    {
      require(_minter != owner);
      return _doesUserHaveBook[owner][bookID];
    }

    /* Add book to user */
    function addBookToUser ( address owner, uint256 bookID )
    {
      // Check to see whether the user have the book in their possession
      require(!doesUserHaveBook ( owner, bookID ));
      _doesUserHaveBook[owner][bookID] = true;
      _userBookCount[owner] = _userBookCount[owner].add(1);
    }
    /* Remove book from user */
    function removeBookFromUser (  address owner, uint256 bookID  )
    {
      // Check to see whether the user have the book in their possession
      require(doesUserHaveBook ( owner, bookID ));
      // Check if removing the book will bring the count of total books to zero
      require(numberOfAUserHolds ( owner ) > 0);
      delete _doesUserHaveBook[owner][bookID];
      _userBookCount[owner] = _userBookCount[owner].sub(1);
    }
   /**  Get the availability of book from library. */
    function isBookAvailable( address owner, uint256 bookID )
    public exists(bookID) view returns(bool)
    { return _books[owner][bookID].availability; }

    /** Check that the book is committed between two entities */
    function isBookCommitted ( address sender, address receiver, uint256 bookID )
    public exists(bookID) view returns(bool)
    { return _committed[sender][receiver][bookID]; }

    /** Check if the book is in transmission */
    function transmissionStatus( address owner, address requester, uint256 bookID )
    public view returns(bool)
    { return _bookTransmission[owner][requester][bookID]; }

    /** Check total account escrow for an entity */
    function accountEscrow ( address requester )
    public view returns(uint256)
    { return _contractEscrow[requester]; }

    /** Check security deposit / Escrow set for transferring a book */
    function bookEscrow ( address owner, address requester, uint256 bookID )
    public view returns(uint256)
    { return _bookEscrow[owner][requester][bookID]; }

  /**
   *  Request book from the library
      msg.sender: is the entity requesting to trade or checkout a book
      owner: is the current owner of the book; the library
      bookID: bookID of book being requested

      If all statements pass, LibraryApp will contact owner that
      msg.sender is requesting a book
   */
    function requestBook ( address owner, uint256 bookID, bool trade ) exists(bookID) public
   {
     emit people( msg.sender, owner);

     // You should not be able to request a book that you are the owner of
     // Question: is this necessary?
     require(_books[owner][bookID].exist);

     // The requester should not be able to request a book from itself
     require(msg.sender != owner);

     // The book should currently be in the possesion of the library
     // and not being loaned out to someone at the moment
     require(isBookAvailable(owner,bookID));

     // The book should not be in transmission or currently committed to a
     // transaction.
     require(!isBookCommitted( msg.sender, owner, bookID));
     require(!transmissionStatus( msg.sender, owner, bookID));

     // base case, book is being loaned. Set mapping in the case the book
     // is being traded
     // the trade is from the owner to the requester (msg.sender) for the book
     if( trade == true) {
	 _trade[owner][msg.sender][bookID] = true;
     }


     // Question: Should probably put some code here to confirm that the book
     // has been requested.
   }

   /**
      Sender establishes an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
    */
   function commitBook ( address sender, address receiver, uint256 bookID, uint256 escrow ) exists(bookID) public {
     // Require the sender of the book is the only one who is able to commit the book.
     require(sender == msg.sender);

     // Require the book exist. If the book does not exist, this function should revert.
     // Question: Already checked in requestBook?
     require(_books[msg.sender][bookID].exist);

     // The book should not be in transmission or currently committed to an
     // transaction.
     require(!isBookCommitted( sender, receiver, bookID));
     require(!transmissionStatus( sender, receiver, bookID));

     // Set book escrow value.
     _bookEscrow[sender][receiver][bookID] = escrow;

     // Set book as being commited
     _committed[sender][receiver][bookID] = true;
   }

   /**
      Sender commits an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
    */
   function commitEscrow ( address sender, address receiver, uint256 bookID, uint256 escrow ) public {
     // require the set book escrow for the book is greater than the minimum escrow
     // defined when the contract was created.
     // must require some sort of deposit is set for the book.
     require(_bookEscrow[sender][receiver][bookID] >= _minEscrow);

     // require the bookEscrow set is equal to the amount passed into this function.
     // Question: Will we always want these values to be equal? Would greater
     // than or equal be sufficient?
     require(_bookEscrow[sender][receiver][bookID] == escrow);

     // require the book has already been commited by the library, but not currently
     // in transmission
     require(isBookCommitted( sender, receiver, bookID));
     require(!transmissionStatus( sender, receiver, bookID));

     // Should force the book to be in the possesion of the library in order to update the
     // escrow

     // Give the contract the escrow as security deposit
     _contractEscrow[receiver] = _contractEscrow[receiver].add(escrow);

     // Change status of the receiver as having committed their security deposit
     _committed[receiver][sender][bookID] = true;

     // Emit signal stating that the escrow for the transmission has been recieved.
     emit escrowCommitted( receiver, escrow );
   }

    /** Checkout book
	    * send a book out via mail in either case of loaning or trading
	    * Once both have committed, the currentOwner must ship the book the the
      * temporary owner
      *
	    * currentOwner: owns bookID
	    * tempOwner: temporary owner of bookID
      */
    function sendBook ( address currentOwner, address tempOwner, uint256 bookID ) exists(bookID) public {
      // the temporary owner checking out the book should have an escrow being held
      // by the contract greater than or equal to the book value set by the current
      // owner
      require(_contractEscrow[tempOwner] >= _bookEscrow[currentOwner][tempOwner][bookID]);

      // both the current owner and new owner should have committed
      require(isBookCommitted(currentOwner,tempOwner,bookID));
      require(isBookCommitted(tempOwner,currentOwner,bookID));

      // both the current owner and new owner should have not set the book in transmission
      require(!transmissionStatus(currentOwner,tempOwner,bookID));
      require(!transmissionStatus(tempOwner,currentOwner,bookID));

      // require the book to exist. If the book does not exist, then the book cannot be
      // checked out.
      require(_books[currentOwner][bookID].exist);

      // require the book to be available
      require(isBookAvailable(currentOwner,bookID));

      // Update the owners book

      // Set the book as being in transmission.
      // Question: One way or two way?
      _bookTransmission[currentOwner][tempOwner][bookID] = true;
      //_bookTransmission[tempOwner][currentOwner][bookID] = true;

      // Set the book as not being available as it is now being loaned out.
      // also set the holder to the tempOwner
      _books[currentOwner][bookID].availability = false;
      _books[currentOwner][bookID].holder = tempOwner;

      // Emit that the book is currently in transmission
      emit bookInTransmission( currentOwner, tempOwner, bookID, true );
    }

    /** acceptBook
      * book has been shipped and received by new or tempOwner
      */
    function acceptBook( address sender, address receiver, uint256 bookID, string condition ) public exists(bookID) {

      // The person recieving the book should be the only one who should be able
      // to accept the book.
      require(msg.sender == receiver);

      // A user should not be able to transferbook to themself
      require(sender != receiver);

      // Check to make sure the book is in the process of being transfer between the
      // two users.
      require(transmissionStatus(sender,receiver,bookID));

      // Check to see if the person current have the book. If the user currently
      // have the book, they should not be able to accept the book twice
      //require(!doesUserHaveBook(receiver,bookID));

      // Add the book to the user
      //addBookToUser ( receiver, bookID );

      // After books have been succefully accepted, reset mappings to false
      _committed[sender][receiver][bookID] = false;
      _committed[receiver][sender][bookID] = false;
      _bookTransmission[sender][receiver][bookID] = false;

      emit bookReceived( true, condition );

      // trade the token now
      // remaining parameters updated in archiveBook
      if( _trade[sender][receiver][bookID] == true) {
	  transferFrom(sender, receiver, bookID);
      }
    }
    /**
     * The book that was loaned is returned to the original owner. 

     */
    function returnBook( address originalOwner, address newOwner, uint256 bookID, string condition ) exists(bookID) public
    {
      // The current owner of the book should be the only one able to return the
      // book.
      require(newOwner == msg.sender);

      // The library should not return a book to themself
      require(newOwner != originalOwner);

      // Book should not be committed or in transfer
      // no commit step necessary, simply check transmission status
      //require(!isBookCommitted(newOwner, originalOwner, bookID));
      require(!transmissionStatus(newOwner, originalOwner, bookID));

      // Ensure book is not in the library already.
      require(!isBookAvailable(originalOwner, bookID));

      // Ensure the user who is try to return the book have more than 0 books.
      //require(numberOfAUserHolds(newOwner) > 0);

      // Check to see if the person current have the book they are trying to return.
      //require(doesUserHaveBook(newOwner,bookID));

      // Set the book as being in transferance back to the newOwner
      _bookTransmission[newOwner][originalOwner][bookID] = true;

      // Emit that the book is currently in transmission
      emit bookInTransmission( originalOwner, newOwner, bookID, true );
    }

    /** Confirm receipt of loaned book, reset book availability, and
     *  refund escrow.
     *  If the archived book is a trade, change book ownership
     *  originalOwner: address that originally owned the book and loaned it to tempOwner
     *  tempOwner: the reader that took out the book from the originalOwner
    */
    function archiveBook( address originalOwner, address newOwner, uint256 bookID, string condition ) public exists(bookID) {

       // Only the library should be able to place the book back into the archive
       // can we allow the originalOwner to allow the newOwner to archive if it is a trade?
       // require(msg.sender == _minter && msg.sender == originalOwner);

       // check transmission status and book availability are in expected positions
       require(!isBookAvailable(originalOwner, bookID));
       require(!transmissionStatus(originalOwner, newOwner, bookID));

       // Since the book have been archived back to the library, we can say the
       // the book can be removed from the users account.
       //removeBookFromUser ( newOwner, bookID  );

      // reset transmission status
      _bookTransmission[newOwner][originalOwner][bookID] = false;

      // reset book availability and the holder of the book
      _books[originalOwner][bookID].availability = true;
      _books[originalOwner][bookID].holder = originalOwner;

      // trade _books mapping if a trade
      if ( _trade[originalOwner][newOwner][bookID] == true ) {

	  // get book of the original Owner, set data for
	  // new Owner and update their bookList
	  Book memory book = _books[originalOwner][bookID];
	  uint256 bookPointer = _booksList[newOwner].push(bookID) - 1;
	  book.bookPointer = bookPointer;
	  book.holder = newOwner; //pedantic? perhaps can simplify rather than overwriting something twice
	  _books[newOwner][bookID] = book;

	  // remove the book from the original Owner
	  // false to not burn book, simply remove from _books mapping and bookList
	  //removeBook( originalOwner, bookID, false);

	  // reset trade mapping
	  _trade[originalOwner][newOwner][bookID] = false;
      }

      // The book has successfully been returned to the rightful owner.
      // Refund the escrow to the temporary owner (here the sender)
      refundEscrow( originalOwner, newOwner, bookID );
    }

    /** Return Escrow
     * After the book has been returned to the library or the trade is complete,
     * refund the escrow amount to the requester
     */
    function refundEscrow( address originalOwner, address tempOwner, uint256 bookID ) private exists(bookID) {

	     // require

	      // decrease the contracts escrow for the tempOwner
	      uint256 refund_escrow = _bookEscrow[originalOwner][tempOwner][bookID];
	      _contractEscrow[tempOwner] = _contractEscrow[tempOwner].sub(_bookEscrow[originalOwner][tempOwner][bookID]);

	      // send the money back to the tempOwner
	      // transfer()?

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
       require( !_lostBooksList[owner][bookID] );

       // Set the book as lost
       _lostBooksList[owner][bookID] = true;

       // Remove the book from circulation.
       removeBook( owner, bookID, false );

       // Broadcast that the book has been lost and added to the lost book queue
       emit bookIsLost(true, bookID);
    }

    /*
    function updateBooksList( address originalOwner, address newOwner, uint256 bookID, bool permanence )
    public exists(bookID) returns(bool)
    {
	// get book of the original Owner
	memory book = _books[originalOwner][bookID];
	uint256 bookPointer = _booksList[newOwner].push(bookID) - 1;
	book.bookPointer = bookPointer;
	_books[newOwner][bookID] = book;

	// permanence means to remove the book from
	removeBook(originalOwner, bookID, permanence, false);
	}*/


  /**
   * Remove book from the library
   * @param bookID The unique ID of the book in the library.
   */
    function removeBook( address owner, uint256 bookID, bool burn )
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

     // up to here the function satisfies if the book is put in the lost
     // state. if burn == true, then remove it from circulation

     // if it not lost, then the user intended to remove it from their _books mapping
     if ( _lostBooksList[owner][bookID] != true && burn == false ) {
	 delete _books[owner][bookID];
     }

     // Question: If the book is found, how will it be added back into circulation?
     // I originally thought we were going to just burn the book if it is lost, then
     // just re add the book with new book to make this process less complicated.
     // If a book is lost and not burned, we would have to have a function to check
     // if the token still exist, then up date the books list mappings without adding
     // an additional token.
     if( burn ) {
	      _burn(owner, bookID);
     }

     return true;
   }

}
