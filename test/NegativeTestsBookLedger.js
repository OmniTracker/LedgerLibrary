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


})
