const ethers = require('ethers');

const { decodeLog, getTokenTransfers, getTransactionMethodDetails } = require('../../lib/abi.js');
const ABIProp = require('../fixtures/ABIProp.json');
const LogProp = require('../fixtures/LogProp.json');
const DSProxyContract = require('../fixtures/DSProxyContract.json');
const LogNoteEventProp = require('../fixtures/LogNoteEventProp.json');
const ERC20_ABI = require('../fixtures/ERC20_ABI.json');
const TransactionReceipt = require('../fixtures/TransactionReceipt.json');
const AmalfiDepositTransaction = require('../fixtures/AmalfiDepositTransaction.json');
const AmalfiContract = require('../fixtures/AmalfiContract.json');

describe('decodeLog', () => {
    it('Should decode the event if it is not anonymous', () => {
        expect(decodeLog(LogProp, ABIProp)).toMatchSnapshot();
    });

    it('Should decode the event if it is anonymous', () => {
        expect(decodeLog(LogNoteEventProp, DSProxyContract.abi)).toMatchSnapshot();
    });
});

describe('getTokenTransfers', () => {
    it('Should return an array with transfers', () => {
        expect(getTokenTransfers({ receipt: TransactionReceipt })).toMatchSnapshot();
    });

    it('Should return an empty array', () => {
        expect(getTokenTransfers(AmalfiDepositTransaction)).toEqual([]);
    });
});

describe('getTransactionMethodDetails', () => {
    it('Should return an object with formatted data about the tx', () => {
        expect(getTransactionMethodDetails(AmalfiDepositTransaction, AmalfiContract.artifact.abi)).toEqual({
            label: 'deposit(address payee: 0x1291Be112d480055DaFd8a610b7d1e203891C274)',
            name: 'deposit',
            signature: 'deposit(address payee)'
        });
    });
});