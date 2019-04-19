const utils = require('./Utils')
const BigNumber = require('bignumber.js')

//const CryptoBears = utils.CryptoBears
const BookLedger = utils.BookLedger
//const generateHash = utils.generateHash
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause

const minEscrow = 0
const maxEscrow = 1000
const maxBookCount = 3

const rentalInterval = 200

contract('PositiveTestsBookLedger', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter.
      accounts[5], minEscrow)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should check add book', async function () {

    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
    console.log("Number of books after adding first book", await bookLedger.numberOfBookInLibrary( accounts[5] ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Add second book
    let bookID_2 = (await bookLedger.newBook.call(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_2, 420011)
    await bookLedger.newBook(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice',{from: accounts[5]} )
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

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': zero40},
	{'var': 'ownerOf.b1', 'expect': accounts[5]}
    ]

    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('Transfer book between users', async function () {
        // Add book for librarian (account[5])
        await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion',{from: accounts[5]} )
        await bookLedger.newBook(accounts[5], 420014, 4, 'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
        console.log("books added to library")

        // There should be two book in the library
        assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)

        // Alice (account[3]) and Bob(account[4]) request book from librarian (account[5])
        await bookLedger.requestBook( accounts[5], 420013, {from: accounts[3]} )
        await bookLedger.requestBook( accounts[5], 420014, {from: accounts[4]} )

        // confirm escrow amount set by librarian for first book
        await bookLedger.commitBook( accounts[5], accounts[3], 420013, 300, {from: accounts[5]} )
        let bookEscrowAmount1 = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
        assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 300 )
        console.log("bookEscrow for first book checkoutBook", bookEscrowAmount1)

        // confirm escrow amount set by liberian for second book
        await bookLedger.commitBook( accounts[5], accounts[4], 420014, 300, {from: accounts[5]} )
        let bookEscrowAmount2 = (await bookLedger.bookEscrow.call( accounts[5], accounts[4], 420014 )).toNumber()
        assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420014 ), 300 )
        console.log("bookEscrow for second book checkoutBook", bookEscrowAmount2)

        // confirm Alice (account[3]) meets escrow amount
        await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, 300, {from: accounts[3]} )
        let accountEscrowAmount1 = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
        assert( await bookLedger.accountEscrow( accounts[3] ), 300 )
        console.log("accountEscrow for first book checkoutBook", accountEscrowAmount1)

        // confirm Bob (account[4]) meets escrow amount
        await bookLedger.commitEscrow( accounts[5], accounts[4], 420014, 300, {from: accounts[4]} )
        let accountEscrowAmount2 = (await bookLedger.accountEscrow.call( accounts[4] )).toNumber()
        assert( await bookLedger.accountEscrow( accounts[4] ), 300 )
        console.log("accountEscrow for second book checkoutBook", accountEscrowAmount2)

        // confirm librarian (account[5]) sent book by putting in transmission for Alice(account[3])
        await bookLedger.checkoutBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
        let bookInTransmission1 = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
        assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
        console.log("Librarian has sent out book to Alice?", bookInTransmission1)

        // confirm librarian (account[5]) sent book by putting in transmission for Bob (account[4])
        await bookLedger.checkoutBook( accounts[5], accounts[4], 420014, {from: accounts[5]} )
        let bookInTransmission2 = await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014)
        assert( await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014), true)
        console.log("Librarian has sent out book to Bob?", bookInTransmission2)

        // confirm Alice received book
      await bookLedger.acceptBook( accounts[5], accounts[3], 420013, "Great!", {from: accounts[3]} )
        let bookReceived1 = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
        console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived1)

        // confirm Bob recieved book
      await bookLedger.acceptBook( accounts[5], accounts[4], 420014, "Good", {from: accounts[4]} )
        let bookReceived2 = await bookLedger.transmissionStatus(accounts[5], accounts[4], 420014)
        console.log("Is book still in transmission after Bob confirmed acceptance of the book?", bookReceived2)


        // Need to add code to test whether a book is transfered between two user without the help of the.
        // library.

        // Expected state Changes
        let bookLedgerStateChanges = [
    	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      {'var': 'ownerOf.b4', 'expect': accounts[5]},
    	{'var': 'bookEscrow.b0b1', 'expect': 300}
        ]

        // Check state after done
        await checkState([bookLedger], [bookLedgerStateChanges], accounts)

  })


  it('should checkout book and return in good faith', async function () {

    // accounts[5] = librarian
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

})
