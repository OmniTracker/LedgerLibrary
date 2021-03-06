const utils = require('./Utils')
const BigNumber = require('bignumber.js')

const BookLedger = utils.BookLedger
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause
const minEscrow = utils.minEscrow
const maxEscrow = utils.maxEscrow

contract('PositiveTestsBookLedger', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter
	accounts[5], minEscrow)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should check add book', async function () {
    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )
    console.log("Number of books after adding first book", await bookLedger.numberOfBookInLibrary( accounts[5] ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Add second book
    let bookID_2 = (await bookLedger.newBook.call(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_2, 420011)
    await bookLedger.newBook(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice', {from: accounts[5]} )
    console.log("Number of books after adding second book", await bookLedger.numberOfBookInLibrary( accounts[5] ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': accounts[5]},
	{'var': 'ownerOf.b1', 'expect': accounts[5]}
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should remove book', async function () {
    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Add second book
    let bookID_2 = (await bookLedger.newBook.call(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_2, 420011)
    await bookLedger.newBook(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)
    // Remove first book
    await bookLedger.removeBook(accounts[5], bookID_1, true, {from:accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': zero40},
	{'var': 'ownerOf.b1', 'expect': accounts[5]}
    ]

    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('Should create two books in the library and send them to two separate users', async function () {
    // Add book for librarian (account[5])
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    await bookLedger.newBook(accounts[5], 420014, 4, 'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )
    console.log("books added to library")

    // There should be two book in the library
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)

    // Alice (account[3]) and Bob(account[4]) request book from librarian (account[5])
    await bookLedger.requestBook( accounts[5], 420013, true, {from: accounts[3]} )
    await bookLedger.requestBook( accounts[5], 420014, true, {from: accounts[4]} )

    // confirm escrow amount set by librarian for first book
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount1 = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for first book checkoutBook", bookEscrowAmount1)

    // confirm escrow amount set by liberian for second book
    await bookLedger.commitBook( accounts[5], accounts[4], 420014, 2, {from: accounts[5]} )
    let bookEscrowAmount2 = (await bookLedger.bookEscrow.call( accounts[5], accounts[4], 420014 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420014 ), 2 )
    console.log("bookEscrow for second book checkoutBook", bookEscrowAmount2)

    // confirm Alice (account[3]) meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount1 = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for first book checkoutBook", accountEscrowAmount1)

    // confirm Bob (account[4]) meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[4], 420014, {from: accounts[4], value: 2} )
    let accountEscrowAmount2 = (await bookLedger.accountEscrow.call( accounts[4] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[4] ), 2 )
    console.log("accountEscrow for second book checkoutBook", accountEscrowAmount2)

    // confirm librarian (account[5]) sent book by putting in transmission for Alice(account[3])
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission1 = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission1)

    // confirm librarian (account[5]) sent book by putting in transmission for Bob (account[4])
    await bookLedger.sendBook( accounts[5], accounts[4], 420014, {from: accounts[5]} )
    let bookInTransmission2 = await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014), true)
    console.log("Librarian has sent out book to Bob?", bookInTransmission2)

    // confirm Alice received book
    await bookLedger.approve(accounts[3], 420013, {from: accounts[5]})
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived1 = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived1)

    // confirm Bob recieved book
    await bookLedger.approve(accounts[4], 420014, {from: accounts[5]})
    await bookLedger.acceptBook( accounts[5], accounts[4], 420014, {from: accounts[4]} )
    let bookReceived2 = await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014)
    console.log("Is book still in transmission after Bob confirmed acceptance of the book?", bookReceived2)

    // Alice receive her escrow
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3]} );

    // Bob  receive his escrow
    await bookLedger.archiveBook( accounts[5], accounts[4], 420014, {from: accounts[4]} )
    await bookLedger.refundEscrow( accounts[4], accounts[4], 420014, {from: accounts[3]} );

    // Need to add code to test whether a book is transfered between two user without the help of the.
    // library.

    // Expected state Changes
    let bookLedgerStateChanges = [
        {'var': 'ownerOf.b3', 'expect': accounts[3]},
        {'var': 'ownerOf.b4', 'expect': accounts[4]},
        {'var': 'bookEscrow.b5b3', 'expect': 2},
        {'var': 'bookEscrow.b5b4', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should checkout book and return in good faith', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    //await bookLedger.approve(accounts[3], 420013, {from: accounts[5]})
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )

    // transaction is complete, put book back on bookshelf
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to Alice, the one that put up an escrow to request the book
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Expected state Changes
    let bookLedgerStateChanges = [
 	{'var': 'ownerOf.b3', 'expect': accounts[5]},
	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should trade book with good faith', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, true, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )

    // confirm Alice received book
    await bookLedger.approve(accounts[3], 420013, {from: accounts[5]})
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )

    // Alice puts the book on her bookshelf
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    console.log("Alice has successfully put the book she received from the library on on her bookshelf")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[3]},
	{'var': 'bookEscrow.b5b3', 'expect': 2},	
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should trade books with good faith and have consistent counts', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add three books for librarian (lorelai) and two for alice
    await bookLedger.newBook(accounts[5], 420010, 4, 'Great Britain', 'Osgood', 'Thomas Hardy', 'Tess of the D\'Urbervilles', {from: accounts[5]} )
    await bookLedger.newBook(accounts[5], 420011, 4, 'Great Britain', 'Newby', 'Emily Bronte', 'Wuthering Heights', {from: accounts[5]} )
    await bookLedger.newBook(accounts[5], 420012, 4, 'Great Britain', 'HarperCollins', 'Aldous Huxley', 'Brave New World', {from: accounts[5]} )      
    await bookLedger.newBook(accounts[3], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[3]} )
    await bookLedger.newBook(accounts[3], 420014, 4, 'Great Britain', 'Bloomsbury', 'J K Rowling', 'Harry Potter and the Sorcerer\'s Stone', {from: accounts[3]} )      

    let bookRequest = 420010;
    let escrow = 300

    // Alice request book from librarian for permanent trade
    await bookLedger.requestBook( accounts[5], bookRequest, true, {from: accounts[3]} )

    // Lorelai establish escrow amount for book
    await bookLedger.commitBook( accounts[5], accounts[3], bookRequest, escrow, {from: accounts[5]} )

    // Alice deposit escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], bookRequest, {from: accounts[3], value: escrow} )

    // Lorelai sends book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], bookRequest, {from: accounts[5]} )

    // confirm Alice received book
    await bookLedger.approve(accounts[3], bookRequest, {from: accounts[5]})
    await bookLedger.acceptBook( accounts[5], accounts[3], bookRequest, {from: accounts[3]} )

    // Alice puts the book on her bookshelf
    await bookLedger.archiveBook( accounts[5], accounts[3], bookRequest, {from: accounts[3]} )
    console.log("Alice has successfully put the book she received from the library on on her bookshelf")
      
    // Book has been added to Alice's booklist,
    // remove book from Lorelai's bookList
    await bookLedger.removeBook( accounts[5], bookRequest, false, {from: accounts[5]} );

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], bookRequest )
    await bookLedger.refundEscrow( accounts[3], accounts[3], bookRequest, {from: accounts[3], value: refundAmount })

    // Check the number of books each user has
    let booksOwnedByAccount5 = (await bookLedger.numberOfBookInLibrary( accounts[5] )).toNumber()
    let booksOwnedByAccount3 = (await bookLedger.numberOfBookInLibrary( accounts[3] )).toNumber()
    console.log("Number of books Owned by account 5", booksOwnedByAccount5)
    console.log("Number of books Owned by account 3", booksOwnedByAccount3)
    assert( booksOwnedByAccount5, 2 );
    assert( booksOwnedByAccount3, 3 );

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': accounts[3]},
	{'var': 'ownerOf.b1', 'expect': accounts[5]},
	{'var': 'ownerOf.b2', 'expect': accounts[5]},
	{'var': 'ownerOf.b3', 'expect': accounts[3]},
	{'var': 'ownerOf.b4', 'expect': accounts[3]},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })



})
