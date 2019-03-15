const utils = require('./Utils')
const BigNumber = require('bignumber.js')

//const CryptoBears = utils.CryptoBears
const BookLedger = utils.BookLedger
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause

const startBalance = 100
//const feedingCost = 20
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

})
