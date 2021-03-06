const utils = require('./Utils')
const BigNumber = require('bignumber.js')

const BookLedger = utils.BookLedger
const checkState = utils.checkState
const checkEvent = utils.checkEvent
const zero40 = utils.zero40
const pause = utils.pause
const minEscrow = utils.minEscrow
const maxEscrow = utils.maxEscrow
const expectRevert = utils.expectRevert

contract('NegativeTestsBookLedger', async function (accounts) {

  beforeEach('Make fresh contract', async function () {
    bookLedger = await BookLedger.new( // We let accounts[5] represent the minter
	accounts[5], minEscrow)
  })

  it('should have correct initial state', async function () {
    await checkState([bookLedger], [[]], accounts)
  })

  it('should not request book not in existence', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    // request a book
    await expectRevert(bookLedger.requestBook( accounts[5], 420010, false, {from: accounts[3]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
	{
	    'var': 'ownerOf.b0', 'expect': zero40,
	    'var': 'ownerOf.b3', 'expect': accounts[5]
	}
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('should not add a book that already exist existence', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    // add same book
    await expectRevert(bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
	{
	    'var': 'ownerOf.b0', 'expect': zero40,
	    'var': 'ownerOf.b3', 'expect': accounts[5]
	}
    ]
  })

  it('should fail to remove a book that does not exist', async function () {
    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction',{from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Add second book
    let bookID_2 = (await bookLedger.newBook.call(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_2, 420011)
    await bookLedger.newBook(accounts[5], 420011,0,'USA','Watson','John Doe','Bears on Ice', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 2)

    // Remove first book
    await bookLedger.removeBook(accounts[5], bookID_1, true, {from:accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Remove known book and revert
    await expectRevert( bookLedger.removeBook(accounts[5], 420014, true, {from:accounts[5]} ) )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    console.log("The library attempted to remove a book that does not exist already. This fails and the book count of the library stays the same")

    // Remove Second book
    await bookLedger.removeBook(accounts[5], bookID_2, true, {from:accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': zero40},
	{'var': 'ownerOf.b1', 'expect': zero40},
    ]
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should fail to remove a book that is not owner', async function () {

    // Add first book
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 0)
    let bookID_1 = (await bookLedger.newBook.call(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )).toNumber()
    assert.equal(bookID_1, 420010)
    await bookLedger.newBook(accounts[5], 420010, 0,'Canada','Blueno','Jane Doe','Living Fiction', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice tries to remove the book from the library
    await expectRevert(bookLedger.removeBook(accounts[5], bookID_1, true, {from:accounts[3]} ))
    console.log("Alice tries to remove the book by accident. Alice does not have the permission to do so, so this fails")
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b0', 'expect': accounts[5]},

    ]
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should fail to remove a book while checked out', async function () {
    // Add first book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )

    // Lorelai sends book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Has Librarian sent out book to Alice?", bookInTransmission)

    // should not remove book while out in transmission
    await expectRevert(bookLedger.removeBook(accounts[5], 420013, true, {from:accounts[5]} ))
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    console.log("The library tries to remove the book while it's out in transission")

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should not allow library to request book from itself', async function() {
    // add a book
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    // request a book
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[5]} ))
    // Expected state Changes
    let bookLedgerStateChanges = [
  {
      'var': 'ownerOf.b0', 'expect': zero40,
      'var': 'ownerOf.b3', 'expect': accounts[5]
  }
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('should not allow book to be requested if checked out', async function() {
    // accounts[5] = librarian
    // accounts[4] = Bob
    // accounts[3] = Alice

    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Has Librarian sent out book to Alice?", bookInTransmission)

    // request that has already been checked out. This should fail because the book is already in the process
    // of being transmitted.
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[4]} ))

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    // failing, take out
    //assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), false)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })
    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('should fail to check out a book once book has been transmitted', async function () {
    // accounts[5] = librarian
    // accounts[4] = Bob
    // accounts[3] = Alice
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // Revert when trying to checkout a book that is in transmission
    await expectRevert(bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[4]} ))
    console.log("Bob tries to request book from Library, but the book is already in transmission")

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction isbookLedger.sendBook complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Bob is now able to request book since it is back into the library
    await bookLedger.requestBook( accounts[5], 420013, false,{from: accounts[4]} )
    console.log("Bob is now able to request book since it is back into the library")

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('should fail to fail to return book with same receiver and sender', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Library tries to return the book to itself without using Alices address information. This should fail.
    await expectRevert(bookLedger.returnBook( accounts[5], 420013, {from: accounts[5]} ))
    console.log("Library tries to return the book to itself without using Alices address information. This should fail.")

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })
  it('should fail to archive book while out of the library', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // Library tries to archive book, but book is currently in transmission
    await expectRevert(bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} ))
    console.log("Library tries to archive book, but book is currently in transmission")

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Library tries to archive book, but book is currently in the possesion of Alice
    await expectRevert(bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} ))
    console.log("Library tries to archive book, but book is currently in the possesion of Alice")

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should fail to commit escrow if book isnt committed', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    await expectRevert(bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} ))
    console.log("Alice cannot put up a security deposit until the book has been committed")

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]}
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should fail to loan a book already loaned out', async function () {
    // accounts[5] = librarian
    // accounts[4] = Bob
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // alice should not be able to commit the book to loan out to anyone else
    await expectRevert(bookLedger.requestBook( accounts[3], 420013, false, {from: accounts[4]} ))

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })

  it('should fail if someone else tries to archive Book', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)
    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )
    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    console.log("Is book still in transmission after Alice confirmed acceptance of the book?", bookReceived)

    // Alice tries to archive book, but she is not the owner
    await expectRevert(bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[3]} ))
    console.log("Alice tries to archive book herself, but this should fail since she is not the library")

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    // Refund Escrow amount back to the original owner
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 );
    await bookLedger.refundEscrow( accounts[3], accounts[3], 420013, {from: accounts[3], value: refundAmount })

    // Expected state Changes
    let bookLedgerStateChanges = [
	{'var': 'ownerOf.b3', 'expect': accounts[5]},
      	{'var': 'bookEscrow.b5b3', 'expect': 2},
    ]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })


  it('should fail to return book if library already holds possesion', async function () {
    // accounts[5] = librarian
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )
    assert.equal(await bookLedger.numberOfBookInLibrary( accounts[5] ), 1)

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, 2, {from: accounts[5]} )
    let bookEscrowAmount = (await bookLedger.bookEscrow.call( accounts[5], accounts[3], 420013 )).toNumber()
    assert( await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 ), 2 )
    console.log("bookEscrow for checkoutBook", bookEscrowAmount)

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: 2} )
    let accountEscrowAmount = (await bookLedger.accountEscrow.call( accounts[3] )).toNumber()
    assert( await bookLedger.accountEscrow( accounts[3] ), 2 )
    console.log("accountEscrow for checkoutBook", accountEscrowAmount)

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    let bookInTransmission = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)
    assert( await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013), true)
    console.log("Librarian has sent out book to Alice?", bookInTransmission)

    // confirm Alice received book
    await bookLedger.acceptBook( accounts[5], accounts[3], 420013, {from: accounts[3]} )
    let bookReceived = await bookLedger.transmissionStatus(accounts[5], accounts[3], 420013)

    // Alice has finished reading book and sends it back to the library
    await bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} )
    let bookInTransmissionReturned = await bookLedger.transmissionStatus(accounts[3], accounts[5], 420013)
    console.log("Is book in transmission after Alice has read the book on its way back to the library?", bookInTransmissionReturned)

    // Library accepts book Alice sent back
    // transaction is complete
    await bookLedger.acceptBook( accounts[3], accounts[5], 420013, {from: accounts[5]} )
    await bookLedger.archiveBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )
    console.log("Alice has successfully returned the book and the library has put it back on the self")

    await expectRevert(bookLedger.returnBook( accounts[5], 420013, {from: accounts[3]} ))
    console.log("Alice has already successfully returned the book so can't return it again")

  // Expected state Changes
  let bookLedgerStateChanges = [
      {'var': 'ownerOf.b3', 'expect': accounts[5]},
      {'var': 'bookEscrow.b5b3', 'expect': 2},
  ]
  // Check state after done
  await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })


  it('Should fail to return escrow to Lorelai when complaint from Alice with verified counter from Lorelai due to incorrect escrow amount.', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    let escrow = 1;
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, escrow, {from: accounts[5]} )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: escrow} )

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )

    // refund escrow to Alice, set Lorelai's book to lost
    // book is not archived as it can be considered lost in transmission
    // better to do all function calls such as refunding, and removing done from here,
    // or internally in rejectBook()?
    // let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )

    // Alice tries to receive more money than what she paid for the book. This fails
    await expectRevert( bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: 100} ) )
    await expectRevert( bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: 100} ) )

    // Alice relize she wont be able to get any money back unless she complies with the original amount set
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )
    await bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: refundAmount} )
    await bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: refundAmount} )

    // Since Alice asked for the right amount back, we can now remove the book circulation.
    await bookLedger.removeBook( accounts[5], 420013, false, {from: accounts[5]})

    // Expected state Changes
    let bookLedgerStateChanges = [{'var': 'ownerOf.b3', 'expect': accounts[5]}]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })


  it('Should fail to return escrow to Lorelai when complaint from Alice with verified counter from Lorelai due to incorrect escrow amount and fail when Lorelai tries to confirm with correct amount.', async function () {
    // accounts[5] = lorelai
    // accounts[3] = Alice
    // Add book for librarian
    await bookLedger.newBook(accounts[5], 420013, 4, 'United States', 'Doubleday', 'Dan Simmons', 'Hyperion', {from: accounts[5]} )

    // Alice request book from librarian
    await bookLedger.requestBook( accounts[5], 420013, false, {from: accounts[3]} )

    // confirm escrow amount set by librarian
    let escrow = 1;
    await bookLedger.commitBook( accounts[5], accounts[3], 420013, escrow, {from: accounts[5]} )

    // confirm Alice meets escrow amount
    await bookLedger.commitEscrow( accounts[5], accounts[3], 420013, {from: accounts[3], value: escrow} )

    // confirm Librarian sent book by putting in transmission
    await bookLedger.sendBook( accounts[5], accounts[3], 420013, {from: accounts[5]} )

    // Alice reject Book
    // Lorelai provide evidence (simply allow her to update a variable saying she has)
    // Lorelai receive escrow, set her book to lost
    // book is not archived as it can be considered lost in transmission
    // let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )


    // Alice tries to receive more money than what she paid for the book. This fails
    await expectRevert( bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: 100} ) )
    await expectRevert( bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: 100} ) )

    // Alice relize she wont be able to get any money back unless she complies with the original amount set
    let refundAmount = await bookLedger.bookEscrow( accounts[5], accounts[3], 420013 )


    // Lorelai tries to verify the right amount, but this fails because Alice still has not confirm the corecct amount. This then fails.
    await expectRevert( bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: refundAmount} ) )


    await bookLedger.rejectBook( accounts[3], accounts[5], 420013, {from: accounts[3], value: refundAmount} )
    await bookLedger.verifiedDefense( accounts[3], accounts[5], 420013, {from: accounts[5], value: refundAmount} )

    // Since Alice asked for the right amount back, we can now remove the book circulation.
    await bookLedger.removeBook( accounts[5], 420013, false, {from: accounts[5]})

    // Expected state Changes
    let bookLedgerStateChanges = [{'var': 'ownerOf.b3', 'expect': accounts[5]}]
    // Check state after done
    await checkState([bookLedger], [bookLedgerStateChanges], accounts)
  })


})
