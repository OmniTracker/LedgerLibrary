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
//const feedingInterval = 3000 // 1000ms == 1sec
//const genes = 0
//const name = 'Bruno'


contract('ERC721MinimalTests', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter.
      accounts[5], startBalance)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should check add book', async function () {
    assert.equal(await bookLedger.numberOfBookInLibraray(), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[0],
                                                0,
                                                0,
                                                'Canada',
                                                'Blueno',
                                                'Jane Doe',
                                                'Living Fiction',{from: accounts[5]} )).toNumber()

    assert.equal(bookID_1, 0)

    let bookID_2 = (await bookLedger.newBook.call(accounts[0],
                                                0,
                                                0,
                                                'USA',
                                                'Blueno',
                                                'John Doe',
                                                'Earth',{from: accounts[5]} )).toNumber()

    assert.equal(bookID_2, 1)

    await checkState([bookLedger], [[]], accounts)

  })

  it('should remove book', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should commit to book removal', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should check if book availability after removal', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should add book then check if number of books', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should renew book', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to double remove book', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to double place book', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to double commit book', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should remove book, place book back, then check availability', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should add book then remove book completely from library', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should fail to remove book if book doesnt exist', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

})
