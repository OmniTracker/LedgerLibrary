const utils = require('./Utils')
const BigNumber = require('bignumber.js')

//const CryptoBears = utils.CryptoBears
const BookLedger = utils.BookLedger
//const generateHash = utils.generateHash
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause
const minEscrow = utils.minEscrow
//const maxEscrow = utils.maxEscrow
//const delta = utils.delta

contract('DisputeBook', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the mintr.
	accounts[5], minEscrow)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('Should return escrow to Alice when complaint with no counter from Lorelai.', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    let escrow = 300;
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, escrow, {from: accounts[5]} )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: escrow} )

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )

    // refund escrow to Alice, set Lorelai's book to lost
    // book is not archived as it can be considered lost in transmission
    // better to do all function calls such as refunding, and removing done from here,
    // or internally in rejectBook()?
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )
    await bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: refundAmount} )
    await bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: refundAmount} )
    await bookLedger.removeBook( accounts[5], 420013, false, {from: accounts[5]})

    // Expected state Changes
    let bookLedgerStateChanges = [{'var': 'ownerOf.b3', 'expect': accounts[5]}]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  

  it('Should return escrow to Lorelai when complaint from Alice with verified counter from Lorelai.', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    let escrow = 300;
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, escrow, {from: accounts[5]} )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: escrow} )

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )

    // Alice reject Book
    // Lorelai provide evidence (simply allow her to update a variable saying she has)
    // Lorelai receive escrow, set her book to lost
    // book is not archived as it can be considered lost in transmission
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )
    await bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: refundAmount} )
    await bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: refundAmount} )
    await bookLedger.removeBook( accounts[5], 420013, false, {from: accounts[5]})  

    // Expected state Changes
    let bookLedgerStateChanges = [{'var': 'ownerOf.b3', 'expect': accounts[5]}]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })


})
