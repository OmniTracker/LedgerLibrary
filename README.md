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
is to say, if something happens to a physical book, whether it's traded, lost, or kept, it's status on the network
is updated to reflect its physical status, in a potentially adversarial manner. The following are different ways
transactions can occur. We will start with two entities, a librarian Lorelai, and a bibliophile Alice. In our
contract, there is no difference between a library and a user, however as this is the most common sort of
scenario, we will start here.


1. Lorelai -> Alice local book rental
2. Lorelai -> Alice local book trade
3. Lorelai -> Alice remote book rental
4. Lorelai -> Alice remote book trade
5. Alice -> Lorelai local book returned
6. Alice -> Lorelai remote book returned
7. Alice mint, burn, or report stolen book

Trading is a one-time transaction with no due-date; ownership of the book changes. Renting will lock the rented
books to the original owner and when the book is returned, an alert should be posted if the transaction occurs after
the due date. In multiple cases, security deposits will be put into escrow to safeguard transacations. Let us
examine each of these scenarios.

### 1 and 5 - Local rental with return

If Alice is checking out a book, she will hand the book or books to Lorelai. Lorelai will scan the books. When the
books are scanned, they are committed to be traded. During this time, a due-date will be applied to the books.
Lorelai will then ask Alice if she wishes to finalize the transaction. Alice decides she no longer wants one of the
books. Lorelai should cancel this book from the commit and finalize the remaining books.  A few weeks later, Alice
goes to return the books. However, Alice has forgetten that one of the books is very popular and had an earlier due date.
Alice should scan the books to commit to trade to Lorelai. Lorelai recognizes one of the books is late, asks Alice to pay
a marginal penalty, and then finalizes the transaction. 

A few adversarial situations.
 - Alice decides she really enjoys the books and doesn't want to return them
 - Alice loses the books and can't return them
 - Alice wants others to enjoy the books and loans them to others
 - Alice returns the book in a damaged state

In the first two cases, we can safeguard Lorelai by having Alice offer a security deposit at the time of transaction.
This means if after a fair amount of time, the book will be considered lost or stolen then Lorelai will be compensated
as such. If Alice had returned the books in time, the security deposit would be returned. In the third case, Alice should
not be able to loan the book to anyone else. If she tries to trade the book with a third person, the trade should be voided.
If she goes ahead and gives the book to someone else, Lorelai is safeguarded via the security deposit - regressing to Alice
having stolen the book. The third person should not be able to add the book back onto the chain as it will remain locked
as a lost book of Lorelai's. Finally, in the fourth case, Lorelai should accept the book with some penalty to Alice then
decide if she wants to repair or burn the book.


### 2 - local trade

Lorelai has a cornicopia of books that she is willing to trade. Alice visits Lorelai and wishes to trade a book. Lorelai can
decide the trade value, whether it's a book Alice owns or a monetary amount. Once the trade value is decided, both commit
their object for trading. When Alice receives the book, she should scan it, check that it is the book Lorelai sent, and finalize
the trasaction as successful. Lorelai should recieve the monetary amount once Alice finalizes the transacation, or also checks and
finalizes the book Alice sent. If both Lorelai and Alice are trading books, a security deposit for each book should be put into escrow
to prevent theft or damage. In this way, if Alice tries to hand Lorelai a damaged book, Lorelai can cancel the transaction. When
this happens, Alice can either return the book to Lorelai and receive her security deposit, or walk away, forfeiting her security
deposit. 


### 3 and 6 - remote rental with return

Alice wants to rent a book from Lorelai who lives on another continent. Alice commits a security deposit to rent the book.
Lorelai commits the book for trade and ships it to Alice. Alice recieves the package in perfect condition, reads it, then
ships it back to Lorelai before the due date. Alice is refunded her security deposit.

In many scenarios, there are parallels to a local transaction. We will highlight cases where it is different.

 - The book is lost or damaged in shipment from Lorelai to Alice
 - The book is lost or damaged in shipment from Alice to Lorelai

If Lorelai sends Alice a damaged book, Alice should cancel the transaction and be refunded her security deposit. However,
what is to prevent Alice from lying and saying a book was damaged when it really wasn't? Lorelai upon hearing the complaint
can refute the claim. If she can provide evidence that the package was sent in good condition (for example a tracking ID provided
by the shipper) to an arbiter on the network, then Alice is found to have lied and Lorelai will recieve the security deposit.
If Alice is able to prove the package arrived damaged, and Lorelai can't prove it was sent in perfect condition, then Alice is
refunded her security deposit. If Lorelai can prove it was sent in perfect condition, then the two must involve the shipper in an
off-network settlement. Alice should be refunded her security deposit and Lorelai should receive the settlement.
The reverse case of Alice shipping back to Lorelai is essentially the same as above.


### 4 - remote trade

Alice wants to trade a book with Lorelai who lives on a different continent. The scenarios are the same as a local trade.
However an arbiter may be included to determine guilt if something unfortunate were to occur to a book during shipment or
someone tries to lie about the status of a shipped book.


### 7 - Minting and Burning books

Alice already owns a small library of books. She wants to add them to the LedgerLibrary so that she can trade them with
others on the network. She should be able to add all of the books with a unique bookID. Once these books are minted, no-one
else should be able to mint a book with the same bookID. Alice should not be able to mint a book with a pre-concieved
bookID. If Alice were nefarious, she may want to do this to prevent another from minting a legitimate book or lying about
what the book actually is. We can prevent this by assuming there is an encrypted phone app that Alice must log into that
scans the book and generates a unique bookID.

Alice has added some books to her library. However she dropped one of the books in her pool and wants to remove it
from her library. She should be able to burn the book. This action should remove the corresponding book token from
the network.

Alice's favorite book 'Alice in Wonderland' has been stolen by the Mad Hatter. Alice should report the book stolen
so that if anyone tries to add the book to the network, it will be rejected as lost. There is nothing preventing
someone from trading stolen books off network, however this defeats the purpose of the smart contract and will be
considered as an undesirable event.