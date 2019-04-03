const BookLedger = artifacts.require("BookLedger")

const startBalance = 100

module.exports = function(deployer, network, accounts) {
  deployer.deploy(
    BookLedger,
    startBalance,
    accounts[5]
  )
}
