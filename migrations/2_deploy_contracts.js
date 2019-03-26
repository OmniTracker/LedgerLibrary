const SimpleStorage = artifacts.require("SimpleStorage");
const ComplexStorage = artifacts.require("ComplexStorage");
const BookLedger = artifacts.require("BookLedger");

const startBalance = 100

module.exports = function(deployer, network, accounts) {
  deployer.deploy(SimpleStorage);
  deployer.deploy(ComplexStorage);
  deployer.deploy(BookLedger, 
    startBalance,
    accounts[5]);

};
