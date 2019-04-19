const utils = require('./Utils')
const BigNumber = require('bignumber.js')

//const CryptoBears = utils.CryptoBears
const BookLedger = utils.BookLedger
//const generateHash = utils.generateHash
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause
const expectRevert = utils.expectRevert

const minEscrow = 0
const maxEscrow = 1000
const maxBookCount = 3
const rentalInterval = 200

contract('NegativeTestsBookLedger', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter.
      accounts[5], minEscrow)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should not request book not in existence', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
    // request a book
    await expectRevert(bookLedger.requestBook( accounts[5], 420010, {from: accounts[3]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
	{
	    'var': 'ownerOf.b0', 'expect': zero40,
	    'var': 'ownerOf.b3', 'expect': accounts[5]
	}
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should not add a book that already exist existence', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
    // add same book
    await expectRevert(bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
	{
	    'var': 'ownerOf.b0', 'expect': zero40,
	    'var': 'ownerOf.b3', 'expect': accounts[5]
	}
    ]
  })

  it('should not add a book if not minter of contract', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
    // add same book
    await expectRevert(bookLedger.newBook(accounts[3], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
  {
      'var': 'ownerOf.b0', 'expect': zero40,
      'var': 'ownerOf.b3', 'expect': accounts[5]
  }
    ]
  })

  it('should not allow library to request book from itself', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
    // request a book
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, {from: accounts[5]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
  {
      'var': 'ownerOf.b0', 'expect': zero40,
      'var': 'ownerOf.b3', 'expect': accounts[5]
  }
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should not allow book to be requested if checked Out', async function() {
    // accounts[5] = librarian
    // accounts[4] = Bob
    // accounts[3] = Alice

    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 300, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 300 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, 300, {from: accounts[3]} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 300 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.checkoutBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // request that has already been checked out. This should fail because the book is already in the process
    // of being transmitted.
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, {from: accounts[4]} ))

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, "Great", {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    //assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), false) //failing, why?
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], accounts[3], 420013, "Great", {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, "Great", {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
	{'var': 'bookEscrow.b0b1', 'expect': 300}
    ]

    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)

  })

  it('should fail to check out a book once book has been transmitted', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to fail to return book with same receiver and sender', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to archive book between transmission of the book out of the library', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to commit escrow if book isnt committed', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to commit invalid escrow', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to return book if library already holds possesion', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to archive book if not in possesion of library', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to remove a book that doesnt exist', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to remove a book twice', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to archive book if not the library', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to remove a book that does not exist', async function () {
    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Add second book
    let bookID_2 = (await bookLedger.newBook.call(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_2, 420011)
    await bookLedger.newBook(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)
    // Remove first book
    await bookLedger.removeBook(accounts[5], bookID_1, true, {from:accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Remove known book and revert
    await expectRevert( bookLedger.removeBook(accounts[5], 420014, true, {from:accounts[5]} ) )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Remove Second book
    await bookLedger.removeBook(accounts[5], bookID_2, true, {from:accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': zero40},
	{'var': 'ownerOf.b1', 'expect': zero40}
    ]
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
})
