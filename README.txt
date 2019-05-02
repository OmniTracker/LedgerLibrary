
Group Members

ronald_baker@brown.edu (Ronald Baker), matthew_mcavoy@brown.edu (Matthew McAvoy)

------------------------------

Instructions to execute

The LedgerLibrary smart contract is meant to be called via a javascript file produced from a companion mobile app. One can view the PositiveTestsLedgerLibrary.js for a few examples of how a transaction might transpire. Test is the same as in Cryptobears.

1. Start a client: ganache-cli --allowUnlimitedContractSize
2. Open a new window at the root of the contract just outside the test directory
3. test cases: truffle test/NegativeTestsBookLedger.js
   - Test files: PositiveTestsBookLedger.js, NegativeTestsBookLedger.js, DisputeBook.js

------------------------------

Description of Project

We aimed to build a smart contract that allows users to trade or loan books. Using a purely digital construct to record the status of a physical item requires special consideration; as such being able to synchronize off-chain goods with on-chain status was our goal. The major factor that allows this to happen is a security deposit escrowed to the smart contract prior to the book being sent for trade safe guards the sender in case of any unfortunate circumstance to the book whether in transport or in the case of a loan, by the one being loaned to. Our github page details the specifics of different occurrences that may occur during a trade or loan: https://github.com/OmniTracker/LedgerLibrary. Below is a concise description of a few interesting adversarial conditions.

Lorelai loans book to Alice. Book lost in shipment.
 - Lorelai receives security deposit after Alice fails to return book
 
Lorelai loans book to Alice. Alice loses book.
 - Lorelai receives security deposit after Alice fails to return book

Alice requests book from Lorelai. Lorelai lies about sending book.
 - Alice receives her security deposit after a timeout for Lorelai to prove she sent the book

Lorelai trades book to Alice. Alice lies about receiving book
 - Lorelai receives security deposit after she proves she sent the book

The assumptions that allow the contract to work are:
 - there's a secure application that can generate unique bookID's
 - there's a third party that can verify a book has been shipped; eg FedEx

------------------------------

Conclusion

When we started the project we aimed to do exactly as above, with an additional desire to include a graphical interface. As solidity did not have an easy way to implement this, we decided to prioritize the rest of our aim. Overall we stayed on track and through discussions with our mentor determined our assumptions were reasonable and that our logic and scope were within the bounds and aim of the project.




