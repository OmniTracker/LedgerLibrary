const BookLedger = artifacts.require('BookLedger')

const web3Utils = require('web3-utils')
const assertDiff = require('assert-diff')
assertDiff.options.strict = true
const BigNumber = require('bignumber.js')
const _ = require('lodash')
const mapValuesDeep = (v, callback) => (
  _.isObject(v)
    ? _.mapValues(v, v => mapValuesDeep(v, callback))
    : callback(v)
)
const zero40 = "0x0000000000000000000000000000000000000000"
const zero64 = "0x0000000000000000000000000000000000000000000000000000000000000000"

const minEscrow = 0
const maxEscrow = 1000
const maxBookCount = 3
const rentalInterval = 200
const delta = 0


let accountBalances = {}

// Checks whether an event was properly emmitted.
function checkEvent(type, event, params) {
  let eventFound = false
  event.logs.forEach((o) => {
    if (o.event === type) {
      eventFound = true
      assertDiff.deepEqual(Object.values(o.args), params)
    }
  })
  if (!eventFound) {
    throw new Error('The specified event was not emmitted: ' + type)
  }
}

// Checks for differences between expected and actual states of contract.
async function checkState(_tokens, _stateChanges, _accounts) {
  let numTokens = _tokens.length
  assert.equal(numTokens, _stateChanges.length)
  for (let i = 0; i < numTokens; i++) {
    let token = _tokens[i]
    let stateChanges = _stateChanges[i]
      let name = await token.contractName.call()
      console.log("name: " + name)
    let _expectedState = await expectedState(token, stateChanges, _accounts, name)
    let _actualState = await actualState(token, _expectedState, _accounts, name)
    assertDiff.deepEqual(_actualState, _expectedState,
      "difference between expected and actual state")
    if (name != 'BookLedger') {
      await checkBalancesSumToTotalSupply(token, _accounts, name)
    }
  }
}

// Builds expected state of contract using custom variables specified in test.
async function expectedState(token, stateChanges, accounts, name) {
  let state = {}
  switch (name) {
    case 'BookLedger':
      state = {
	  'ownerOf': {'b0': zero40, 'b1': zero40, 'b2': zero40, 'b3': zero40, 'b4': zero40},
	  'minter': accounts[5],
	  'bookEscrow': {'b5b3': 0, 'b5b4': 0},
      }
    break
    case 'CryptoBears':
    state = {
      'balanceOf': {
        'a0': 0, 'a1': 0, 'a2': 0, 'a3': 0, 'a4': 0, 'a5': 0, 'a6': 0, 'a7': 0
      },
      'ownerOf': {'b0': zero40, 'b1': zero40, 'b2': zero40, 'b3': zero40, 'b4': zero40},
      'committed': {
        'b0': {'b0': false, 'b1': false, 'b2': false, 'b3': false, 'b4': false},
        'b1': {'b0': false, 'b1': false, 'b2': false, 'b3': false, 'b4': false},
        'b2': {'b0': false, 'b1': false, 'b2': false, 'b3': false, 'b4': false},
        'b3': {'b0': false, 'b1': false, 'b2': false, 'b3': false, 'b4': false},
        'b4': {'b0': false, 'b1': false, 'b2': false, 'b3': false, 'b4': false},
      },
      'minter': accounts[5],
    }
    break
    default:
    throw new Error('Contract name not recognized ' + name)
  }

  for (let i = 0; i < stateChanges.length; ++i) {
    let variable = stateChanges[i].var
    if (_.has(state, variable)) {
      let defaultVal = state[variable]
      let change = stateChanges[i].expect
      if (defaultVal == change) {
        throw new Error("Default value specified for variable " + variable)
      } else {
        _.set(state, variable, change)
      }
    } else {
      throw new Error("variable " + variable + " not found in state")
    }
  }

  return state
}

// Gets actual state of contract.
async function actualState(token, state, accounts, name) {
  let values
  switch (name) {
    case 'BookLedger':
      values = [
	  await token.ownerOf.call(420010),
	  await token.ownerOf.call(420011),
	  await token.ownerOf.call(420012),
	  await token.ownerOf.call(420013),
	  await token.ownerOf.call(420014),
	  await token._minter.call(),
	  (await token.bookEscrow.call(accounts[5], accounts[3], 420013)).toNumber(),
	  (await token.bookEscrow.call(accounts[5], accounts[4], 420014)).toNumber(),
    ]
    break
    default:
    throw new Error('Contract name not recognized ' + name)
  }
  return mapValuesDeep(state, () => values.shift())
}


// Used for negative tests.
async function expectRevert(contractPromise) {
  try {
    await contractPromise;
  } catch (error) {
    assert(
      error.message.search('revert') >= 0,
      'Expected error of type revert, got \'' + error + '\' instead',
    );
    return;
  }
  assert.fail('Expected error of type revert, but no error was received');
}

// Waits the specified number of ms before continuing test execution.
function pause(ms) { return new Promise(resolve => { setTimeout(resolve, ms)}) }

module.exports = {
  BookLedger: BookLedger,
  checkEvent: checkEvent,
  checkState: checkState,
  expectRevert: expectRevert,
  zero40: zero40,
  zero64: zero64,
  minEscrow: minEscrow,
  maxEscrow: maxEscrow,
  delta: delta,
  pause: pause,
}
