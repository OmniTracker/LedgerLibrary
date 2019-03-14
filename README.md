# LedgerLibrary
Library Books and Documents on Ethereum Blockchain

You will also need to run npm install followed by export PATH=$(npm bin):$PATH

Before running the test suite, you must first spin up a private blockchain on your computer with
ganache.  To do this, open a new terminal tab and run the command ‘ganache-cli.’  Wait till you
see ‘Listening on 127.0.0.1:8545’.  This tells you the blockchain is ready to go.  Ganache sets up a
blockchain exactly like Ethereum’s except your computer is the only node in the network.  It also
preloads a list of 10 addresses with balances of 100 eth each and exposes their private keys so that
truffle can use them to send transaction
