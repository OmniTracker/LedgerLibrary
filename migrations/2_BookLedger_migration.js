const BookLedger = artifacts.require("BookLedger")

const minEscrow = 0
const maxEscrow = 1000
const maxBookCount = 3
const rentalInterval = 200
const delta = 3


module.exports = function(deployer, network, accounts) {
  deployer.deploy(
    BookLedger,
      minEscrow,
    accounts[5]
  )
}
