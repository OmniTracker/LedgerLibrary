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

    // request that has already been checked out
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, {from: accounts[4]} ))

    // Expected state Changes
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
	{'var': 'bookEscrow.b0b1', 'expect': 300}
    ]

    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)

  })


})
