const utils = require('./Utils')
const BigNumber = require('bignumber.js')

//const CryptoBears = utils.CryptoBears
const BookLedger = utils.BookLedger
const generateHash = utils.generateHash
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause

const startBalance = 100
const rentalInterval = 200

contract('ERC721MinimalTests', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter.
      accounts[5], startBalance)
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
    //let removeBook = await bookLedger.removeBook(accounts[0], bookID_1)
    await bookLedger.removeBook(accounts[5], bookID_1, {from:accounts[5]} )
    //console.log("number of books after adding two books and removing one book", await bookLedger.numberOfBookInLibrary( accounts[0] ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': zero40},
	{'var': 'ownerOf.b1', 'expect': accounts[0]}
    ]

    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('Get book from library', async function () {

    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Request book from library.

    // Library mark the book as being transmitted

    // The user should signal the book has been recieved

    // The user should began to return the book to the libray.

    // The library should indicate they were able to recieve the book

    // Once the book has reveived the book, will should then remove the book from
    // libray.

  })

  it('should check if book availability after removal', async function () {

    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Check to see if the book is available

    // remove the book from the libray
    await bookLedger.removeBook(accounts[5], bookID_1, {from:accounts[5]} )
    //console.log("number of books after adding two books and removing one book", await bookLedger.numberOfBookInLibrary( accounts[0] ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Check to see if the book is now set to not available

  })

  it('Transfer book between users', async function () {

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

    // Take book out with account[3]

    // Take book out with account[4]

    // Transfer books between two user

    // return both books back to the libray

    // Remove both book from the library

  })

  it('Should fail to add book into circulation if not library', async function () {



  })

})
