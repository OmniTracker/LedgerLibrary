# LedgerLibrary
Library Books and Documents on Ethereum Blockchain

You will also need to run npm install followed by export PATH=$(npm bin):$PATH

Before running the test suite, you must first spin up a private blockchain on your computer with
ganache.  To do this, open a new terminal tab and run the command ‘ganache-cli.’  Wait till you
see ‘Listening on 127.0.0.1:8545’.  This tells you the blockchain is ready to go.  Ganache sets up a
blockchain exactly like Ethereum’s except your computer is the only node in the network.  It also
preloads a list of 10 addresses with balances of 100 eth each and exposes their private keys so that
truffle can use them to send transaction


## Trading Books

A major goal of this smart contract is to synchronize off-chain goods with on-chain status. What this means
is to say, if something happens to a physical book, whether it's traded, lost, or kept, it's status is updated
to reflect this status in a potentially adversarial manner. The following are different ways transactions can occur.
We will start with two entities, a librarian Lorelai, and a bibliophile Alice. In our contract, there is no difference
between a library and a user, however as this is the most common sort of scenario, we will start here.


1. Lorelai -> Alice local transaction
   1. trade succeeds
   2. trade fails
2. Lorelai -> Alice remote transaction
   1. trade succeeds
   2. trade fails
3. Alice -> Lorelai return book
   1. returned before due-date
   2. returned after due-date
4. Alice mint,burn
   1. Alice mints book with clean bookID
   2. Alice mints book with dirty bookID

Trading is a one-time transaction with no due-date; ownership of the book changes. Renting will expect two
transacations with an alert if the second transaction occurs after the due date; ownership should be locked to the
original owner to ensure no one else can steal the book as their own.

Let us examine each of these scenarios.

### 1 and 3 - Local transaction with return

If Alice is checking out a book, she will hand the book or books to Lorelai. Lorelai will scan the books. When the
books are scanned, they are committed to be traded. During this time, a due-date will be applied to the books.
Lorelai will then ask Alice if she wishes to finalize the transaction. Alice decides she no longer wants one of the
books. Lorelai should cancel the book from the commit and finalize the remaining books.  Alice forgets that one of the
books is very popular and has an earlier deadline, so that when she comes to return the books, one of them is late.
Alice should scan the books to commit to trade to Lorelai. It should check that as these books were rented that this
second trade should only be between Alice and Lorelai. That is, Alice shouldn't be able to trade the book with anyone
else once she checks it out. Lorelai recognizes one of the books is late and finalizes the transaction.

A few adversarial situations.
 - Alice decides she really enjoys the books and doesn't want to return them
 - Alice loses the books and can't return them
 - Alice wants others to enjoy the books and loans them to others
 - Alice returns the book in a damaged state.

In the first two cases, we can safeguard Lorelai by having Alice offer a security deposit at the time of transaction.
This means if after a fair amount of time, the book will be considered lost or stolen and Lorelai will be compensated
as such. If Alice had returned the books in time, the security deposit would be returned. In the third case, Alice should
not be able to loan the book to anyone else. If she tries to trade the book with a third person, the trade should be voided.
If she goes ahead and gives the book to someone else, Lorelai is safeguarded via the security deposit. The third person
will not be able to add the book ever again on the chain as it will remain locked as a lost book of Lorelai's. Finally,
in the fourth case, Lorelai should accept the book with some penalty to Alice then decide if she wants to burn the book.
When the book is burned, its token is removed from the contract.

### 2 - remote transactions

### 4 - Minting and Burning books

Alice already owns a small library of books. She wants to add them to the LedgerLibrary so that she can trade them with
others on the network. She should be able to add all of the books with a unique bookID. Once these books are minted, no-one
should be able to mint a book with the same bookID. Alice should not be able to mint a book with a pre-concieved bookID. One
may want to do this to prevent another from minting a legitimate book or lying about what the book actually is. We can prevent
this by assuming there is an encrypted phone app that Alice must log into that scans the book and generates a unique bookID.