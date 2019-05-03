pragma solidity ^0.4.24;
import "./Tokens/ERC721.sol";
import "./Support/SafeMath.sol";

/**
 * This contract inherits from ERC721 to create non-fungible
   tokens for books with unique bookIDs. Allows users to trade
   and loan books.
 */
contract BookLedger is ERC721 {
  string public constant contractName = 'BookLedger';
  using SafeMath for uint256;

  event bookAdded(string publisher, string author, string name );
  event bookRemoved(string publisher, string author, string name );
  event bookRequested(address owner, address requester, uint256 bookID);
  event escrowCommitted(address newOwner, uint256 escrowAmount );
  event bookInTransmission(address currentOwner, address tempOwner, uint256 bookID, bool InTransmission );
  event bookReceived(bool transmissionComplete );
  event bookIsLost(address bookOwner, bool bookLost, uint256 bookID);
  event escrowRefunded(address recipient, uint256 amount);
  event startTimerForDefense( address plaintiff, address defendant, uint256 startTimer);
  event deltaTimeNotElapsed(uint256 basically_now, uint256 delta_now);

  // index books by entity address and bookID
  mapping(address => mapping(uint256 => Book)) internal _books;

  // _booksList contains a list of all books owned by an entity
  mapping(address => uint256[]) internal _booksList;

  // _lostBooksList contains a mapping of all the lost books in universe
  mapping(address => mapping(uint256 => bool)) internal _lostBooksList;

  // boolean mapping of book requested
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _request;

  // boolean mapping for whether book will be loaned or traded
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _trade;

  // Commit books for user. The indexing for this structure corresponds to the
  // address of the sender, receiver of the book, and the book ID
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _committed;

  // Will hold the transmission status of a book corresponding to the sender, receiver, and bookID
  // The book should be committed by both entities for first transmission
  // When returning book, it does not need to be committed
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _bookTransmission;

  // determine escrow amount for book trade or rent.
  // contract holds escrow for each address: sum of _bookEscrows
  mapping(address => mapping(address => mapping(uint256 => uint256))) internal _bookEscrow;
  mapping(address => uint256) internal _contractEscrow;

  // mapping of whether a complaint was filed and the time the complaint was filed
  mapping(address => mapping(address => mapping(uint256 => bool))) internal _complaint;
  mapping(address => mapping(address => mapping(uint256 => uint256))) internal _timeout;

  // approvedUser for each book to withdraw funds
  mapping(address => mapping(uint256 => bool)) internal _approvedUser;

  address public _minter;
  uint256 public _minEscrow; // Set the min escrow number
  uint256 public _maxEscrow; // Limit the max escrow number
  uint256 public _delta;

  constructor(
    address minter,
    uint256 minEscrow
  ) public {
      _minter = minter;
      _minEscrow = minEscrow;
      _maxEscrow = minEscrow.mul(3);
      _delta = 3;
  }
  modifier onlyMinter() {
    require(msg.sender == _minter, "msg.sender is not _minter.");
    _;
  }
  modifier exists(uint256 bookID) {
      require(_exists(bookID), "ERC721 token exists for book with specified ID does not exist.");
    _;
  }

  struct Book {
    uint256 bookID;
    uint256 bookPointer;
    uint256 timeOfOrigin;
    bool availability;
    uint256 genre;
    string country;
    string publisher;
    string author;
    string name;
    bool exist;
    address holder;
    bool requested;
  }

  /**
   * Mint new book to library
   */
   function newBook ( address owner,
		      uint256 bookID,
                      uint256 genre,
                      string country,
                      string publisher,
                      string author,
                      string name)
      public returns(uint256)
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
       name: name,
       exist: true,
       holder: owner,
       requested: false
     });
      // Require the book id does not exist in the _books mapping
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

   /** Public view functions for state and
    *  property of an entities book
    */

    /** Get number of books in an entities library  */
    function numberOfBookInLibrary ( address owner )
    public view returns(uint256)
    {
      return _booksList[owner].length;
    }

   /**  Get the availability of book from an entities library. */
    function isBookAvailable( address owner, uint256 bookID )
    public exists(bookID) view returns(bool)
    { return _books[owner][bookID].availability; }

    /** Check that the book is requested between two entities */
    function isBookRequested ( address sender, address receiver, uint256 bookID )
    public exists(bookID) view returns(bool)
    { return _request[sender][receiver][bookID]; }

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

    /** Check security deposit/escrow set for transferring a book */
    function bookEscrow ( address owner, address requester, uint256 bookID )
    public view returns(uint256)
    { return _bookEscrow[owner][requester][bookID]; }

  /**
   *  Request book from the library
   *  msg.sender: is the entity requesting to trade or checkout a book
   *  owner: is the current owner of the book; eg. a library
   *  bookID: bookID of book being requested
   *  trade: bool whether the request is to trade or rent a book

   *  If all statements pass, LibraryApp will contact owner that
   *  msg.sender is requesting a book
   */
    function requestBook ( address owner, uint256 bookID, bool trade ) exists(bookID) public
   {
     // The requester should not be able to request a book from itself
     require(msg.sender != owner);

     // You should not be able to request a book that you are the owner of
     require(_books[owner][bookID].exist);

     // The book should currently be in the possesion of the library
     // and not being loaned out to someone at the moment
     require(isBookAvailable(owner,bookID));

     // The book should not be in transmission or currently committed to a
     // transaction.
     require(!isBookCommitted( msg.sender, owner, bookID));
     require(!transmissionStatus( msg.sender, owner, bookID));

     // base case, book is being loaned. Set mapping in the case the book is being traded
     // the trade is from the owner to the requester (msg.sender) for the book
     if( trade == true) {
	 _trade[owner][msg.sender][bookID] = true;
     }

     // update mapping for book being requested
     _request[owner][msg.sender][bookID] = true;
     _books[owner][bookID].requested = true;

     emit bookRequested( owner, msg.sender, bookID);
   }

   /**
      Sender establishes an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
      bookID: the bookID of book being requested
      escrow: escrow amount to protect the sender in case of an unfortunate circumstance
    */
   function commitBook ( address sender, address receiver, uint256 bookID, uint256 escrow ) exists(bookID) public {
     // Require the sender of the book is the only one who is able to commit the book.
     require(sender == msg.sender);

     // Require the book exist. If the book does not exist, this function should revert.
     require(_books[msg.sender][bookID].exist);

     // require the book has been requested
     require(isBookRequested(sender, receiver, bookID));

     // The book should not be in transmission or currently committed to a
     // transaction.
     require(!isBookCommitted( sender, receiver, bookID));
     require(!transmissionStatus( sender, receiver, bookID));

     // Set book escrow value.
     _bookEscrow[sender][receiver][bookID] = escrow;

     // Set book as being committed
     _committed[sender][receiver][bookID] = true;
   }

   /**
      Sender commits an escrow value for receiver to deposit to the contract
      as a security deposit should something happen to the book

      sender: entity that currently owns book, eg. librarian
      receiver: entity requesting book from sender, eg bibliophile
    */
   function commitEscrow ( address sender, address receiver, uint256 bookID ) public payable {
     uint256 escrow = msg.value;
     // require the set book escrow for the book is greater than the minimum escrow
     // defined when the contract was created.
     require(_bookEscrow[sender][receiver][bookID] >= _minEscrow);

     // require the bookEscrow set is equal to the amount passed into this function.
     // Uncertain as the the benefit to changing this to an inequality
     require(_bookEscrow[sender][receiver][bookID] == escrow);

     // require the book has already been requested and committed by the library,
     // but not currently in transmission
     require(isBookRequested( sender, receiver, bookID));
     require(isBookCommitted( sender, receiver, bookID));
     require(!transmissionStatus( sender, receiver, bookID));

     // Require the receiver of the book is calling the function
     require(receiver == msg.sender);

     // Give the contract the escrow as security deposit
     _contractEscrow[receiver] = _contractEscrow[receiver].add(escrow);

     // Change status of the receiver as having committed their security deposit
     _committed[receiver][sender][bookID] = true;

     // Emit signal stating that the escrow for the transmission has been recieved.
     emit escrowCommitted( receiver, escrow );
   }

    /** Checkout book
     * Offchain actions: send a book out via mail in either case of loaning or trading
     * Once both have committed, the currentOwner must ship the book the the
     * temporary owner
     *
     * owner: owns bookID
     * requester: requester of bookID, either for loan or trade
     */
    function sendBook ( address owner, address requester, uint256 bookID ) exists(bookID) public {
      // the temporary owner checking out the book should have an escrow being held by the
      // contract greater than or equal to the book value set by the current owner
      require(_contractEscrow[requester] >= _bookEscrow[owner][requester][bookID]);

      // require the book to exist. If the book does not exist, then the book cannot be
      // checked out.
      require(_books[owner][bookID].exist);

      // book should be requested from owner to requester
      require(isBookRequested(owner, requester, bookID));

      // both the current owner and new owner should have committed
      require(isBookCommitted(owner, requester, bookID));
      require(isBookCommitted(requester, owner, bookID));

      // both the current owner and new owner should have not set the book in transmission
      require(!transmissionStatus(owner, requester, bookID));
      require(!transmissionStatus(requester, owner, bookID));

      // require the book to be available
      require(isBookAvailable(owner,bookID));

      // Set the book as being in transmission from current to temp owner
      _bookTransmission[owner][requester][bookID] = true;

      // Set the book as not being available as it is now being loaned out.
      // also set the holder to the requester
      _books[owner][bookID].availability = false;
      _books[owner][bookID].holder = requester;

      // Emit that the book is now in transmission
      emit bookInTransmission( owner, requester, bookID, true );
    }

    /** acceptBook
      * book has been shipped and received by new or tempOwner

      * sender: owner of bookID sent to receiver
      * receiver: new or temp owner of bookID requested from sender
      */
    function acceptBook( address sender, address receiver, uint256 bookID ) public exists(bookID) {

      // The person recieving the book should be the only one who should be able
      // to accept the book.
      require(msg.sender == receiver);

      // A user should not be able to accept a book to themself
      require(sender != receiver);

      // book accepted should be the one that was requested
      // sender and receiver could be either the owner or requester
      require(isBookRequested(sender, receiver, bookID) || isBookRequested(receiver, sender, bookID));

      // get the address of the owner of the book
      address owner = ownerOf(bookID);

      // book should still be committed between sender and receiver
      if ( receiver != owner ) {
	  require(isBookCommitted(sender, receiver, bookID));
	  require(isBookCommitted(receiver, sender, bookID));
      }

      // Check to make sure the book is in the process of being transferred
      // between the two users.
      require(transmissionStatus(sender,receiver,bookID));

      // After books have been succefully accepted, reset mappings to false
      _committed[sender][receiver][bookID] = false;
      _committed[receiver][sender][bookID] = false;
      _bookTransmission[sender][receiver][bookID] = false;

      emit bookReceived( true );

      // If book is a trade, trade the token now
      // remaining parameters updated in archiveBook
      if( _trade[sender][receiver][bookID] == true ) {
	  transferFrom(sender, receiver, bookID);
      }
      // If the owner has received the book, set request off
      if ( msg.sender == owner || _trade[sender][receiver][bookID] == true ) {
            _books[owner][bookID].requested = false;
      }

    }
    /**
     * The book that was loaned is returned to the original owner.
     *
     * owner: address of the bookID that owned the book before request
     * msg.sender: address that requested a book loan for bookID from owner
     */
    function returnBook( address owner, uint256 bookID ) exists(bookID) public
    {
      // the msg.sender should not be able to return a book to themself
      require(msg.sender != owner);

      // check book is not still not available
      require(!isBookAvailable(owner, bookID));

      // book returned should be the one that was requested
      require(isBookRequested(owner, msg.sender, bookID));

      // Book should not be committed or in transfer
      // no commit step necessary, simply check transmission status
      require(!isBookCommitted(owner, msg.sender, bookID));
      require(!isBookCommitted(msg.sender, owner, bookID));
      require(!transmissionStatus(msg.sender, owner, bookID));

      // Set the book as being in transferance back to the owner
      _bookTransmission[msg.sender][owner][bookID] = true;

      // Emit that the book is now in transmission
      emit bookInTransmission( msg.sender, owner, bookID, true );
    }

    /** Confirm receipt of loaned book, reset book availability, and
     *  refund escrow.
     *  If the archived book is a trade, change book ownership

     *  owner: address that originally owned the book and loaned it to the requester
     *  requester: the reader that took out the book from the owner
    */
    function archiveBook( address owner, address requester, uint256 bookID ) public exists(bookID) {

      // book archived should be the one that was requested
      require(isBookRequested(owner, requester, bookID));

      // check the book is not available
      require(!isBookAvailable(owner, bookID));

      // book should not be in transit
      require(!transmissionStatus(owner, requester, bookID));
      require(!transmissionStatus(requester, owner, bookID));

      // book should not be archived while it's out and being read
      require(_books[owner][bookID].requested == false, "Book is still being read");

      // remove request from mapping
      delete _request[owner][requester][bookID];

      // reset book availability, holder of the book
      _books[owner][bookID].availability = true;
      _books[owner][bookID].holder = owner;

      // allow the user to receive their escrow
      _approvedUser[requester][bookID] = true;

      // trade _books mapping if a trade
      if ( _trade[owner][requester][bookID] == true ) {

	  // get book of the original Owner, set data for
	  // new Owner and update their bookList
	  Book memory book = _books[owner][bookID];
	  uint256 bookPointer = _booksList[requester].push(bookID) - 1;
	  book.bookPointer = bookPointer;
	  book.holder = requester; //pedantic? perhaps can simplify rather than overwriting something twice
	  _books[requester][bookID] = book;

	  // remove the book from the original Owner
	  // as msg.sender is required to remove, must call via js file

	  // reset trade mapping
	  _trade[owner][requester][bookID] = false;
      }
    }

    /**
     * Only allow verified users to receive escrow, note, does not update bookEscrow
     */
    function refundEscrow( address escrowHolder, address escrowPayable, uint256 bookID ) public payable {

      // once the address payable has been approved, can they withdraw the escrow
      require( _approvedUser[escrowPayable][bookID] == true );

      // Require the amount being transfer to the receiving account does not
      // exceed the total amount already in escrow for the receiver.
      require(_contractEscrow[escrowHolder] >= msg.value);

      // send the escrow to the payable address
      _contractEscrow[escrowHolder] = _contractEscrow[escrowHolder].sub(msg.value);
      escrowPayable.transfer(msg.value);
      emit escrowRefunded(escrowPayable, msg.value);
    }

    /** rejectBook. Reject a book either because it was lost in transmission or
     *  damaged. Whether the person lies about this doesn't matter as they've
     *  already placed an escrow to the contract.
     *
     *  Either party may call this function.
     */
    function rejectBook ( address plaintiff, address defendant, uint256 bookID ) public payable exists(bookID) {

      // if the first complaint, start a timer so that if no counter
      // is provided in time, refund the security deposit to the plaintiff

      // refunded amount should be the same as what's in escrow
      require( msg.value == _bookEscrow[defendant][plaintiff][bookID] );

      // get the address of the owner of the bookID
      address owner = ownerOf(bookID);
      emit bookIsLost( owner, true, bookID);

      // start a timer from when a complaint arrives
      if( _complaint[plaintiff][defendant][bookID] == false) {
	       _timeout[plaintiff][defendant][bookID] = now + _delta;
	        _complaint[plaintiff][defendant][bookID] = true;
      }

      emit startTimerForDefense( plaintiff, defendant, _timeout[plaintiff][defendant][bookID]);

      // if the elapsed time has passed, refund to the plaintiff
      // book can be considered lost, remove from defendants bookList
      uint256 delta_now = _timeout[plaintiff][defendant][bookID];

      // if it is past the defined delta time, allow the plaintiff to
      // withdraw their deposit. The book should be destroyed
      // use js file to removeBook
      if(now > delta_now || _approvedUser[plaintiff][bookID] == true) {
	       refundEscrow( plaintiff, plaintiff, bookID );
	        delete (_bookEscrow[defendant][plaintiff][bookID]);
	        _lostBooksList[owner][bookID] = true;
	        _books[owner][bookID].availability = false;
      } else {
	       emit deltaTimeNotElapsed(now, delta_now);
	       // test case, after calling once, allow override to withdraw funds
	       // this else statement should not be included in a final product!
	       _approvedUser[plaintiff][bookID] = true;
      }
    }

    /** verifiedDefense.
     *  If the plaintiff can provide evidence the book was sent, they can
     *  override the timer to claim the escrow by calling rejectBook
     */
    function verifiedDefense ( address plaintiff, address defendant, uint256 bookID ) public payable exists(bookID) {

      // the defendant must have a complaint filed against them
      // don't care about timer, as if the plaintiff has not claimed after
      // delta but the defense them provides evidence, they should be able to claim
      require( _complaint[plaintiff][defendant][bookID] == true );

      // allow the defendant to now withdraw funds
      _approvedUser[defendant][bookID] = true;

      // receive the escrow and set the book as lost
      refundEscrow( plaintiff, defendant, bookID);
      delete (_bookEscrow[defendant][plaintiff][bookID]);
      _lostBooksList[defendant][bookID] = true;
    }


    /**
     * Remove book from the library
     * @param bookID The unique ID of the book in the library.
     */
    function removeBook( address owner, uint256 bookID, bool burn )
	public exists(bookID) returns(bool)
    {
      // The only one who should be able to remove a book is the owner of the book
      require( msg.sender == owner );
      require(_books[owner][bookID].exist);

      // book should not be archived while it's out and being read
      // but allow it to be remove if lost
      require(_books[owner][bookID].requested == false || _lostBooksList[owner][bookID] == true, "Book is still being read");


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
	       delete ( _books[owner][bookID] );
      }

      if( burn ) {
	       _burn(owner, bookID);
      }

      return true;
    }
    
    /**
     * Add a lost book back to the owner's library
     */
    function foundBook( address owner, uint256 bookID )
	public exists(bookID) returns(bool)
    {
      // check that the owner is the actual owner of the lost book
      require(owner == ownerOf(bookID));

      // check that the book is currently lost
      require( _lostBooksList[owner][bookID] == true );

      // update the lostBooksList and various parameters
      delete _lostBooksList[owner][bookID];
    }
}
