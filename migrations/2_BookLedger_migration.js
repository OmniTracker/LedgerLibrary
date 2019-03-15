const BookLedger = artifacts.require("BookLedger")

const startBalance = 100
//const feedingCost = 20
//const feedingInterval = 60 //seconds

//const cryptoBearsPrice = Number(web3.toWei(.5, 'ether'))

module.exports = function(deployer, network, accounts) {
  deployer.deploy(
    BookLedger,
    startBalance,
    accounts[5]
  )
}
