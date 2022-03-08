jest.mock('../../lib/firebase', () => ({
    getContractData: jest.fn(),
    storeTransactionMethodDetails: jest.fn(),
    storeTransactionTokenTransfers: jest.fn()
}));

jest.mock('../../lib/utils', () => ({
    getFunctionSignatureForTransaction: jest.fn()
}));

jest.mock('../../lib/abi', () => ({
    getTokenTransfers: jest.fn(),
    getTransactionMethodDetails: jest.fn()
}));

const { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers } = require('../../lib/firebase');
const { getTokenTransfers, getTransactionMethodDetails } = require('../../lib/abi');

const Helper = require('../helper');
const { processTransactions} = require('../../lib/transactions');
const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TokenAbi = require('../fixtures/ABI.json');
const Transaction = require('../fixtures/TransactionReceipt.json');
let helper;

describe('processTransactions ', () => {
    beforeEach(jest.resetAllMocks);

    it('Should get contract data from to, get proxy data, store transaction details & store token transfers ', async () => {
        getContractData
            .mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    resolve({ proxy: '0x123' })
                });
            })
            .mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    resolve({ abi: TokenAbi })
                });
            });
        getTransactionMethodDetails.mockImplementationOnce(() => ({ name: 'test' }));
        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(getContractData).toHaveBeenCalledTimes(2);
        expect(getTransactionMethodDetails).toHaveBeenCalledWith(Transaction, TokenAbi);
        expect(storeTransactionMethodDetails).toHaveBeenCalledWith('123', 'hardhat', '0x123', { name: 'test' });
        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should store empty transaction details & store token transfers when no to', async () => {
        const transaction = {
            ...Transaction,
            to: null
        };

        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [transaction]);

        expect(getContractData).not.toHaveBeenCalled();
        expect(storeTransactionMethodDetails).toHaveBeenCalledWith('123', 'hardhat', '0x123', null);
        expect(getTokenTransfers).toHaveBeenCalledWith(transaction);
        expect(storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should store empty transaction details & store token transfers when no contracts @to', async () => {
        getContractData
            .mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    resolve(null)
                });
            });
        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(getContractData).toHaveBeenCalledTimes(1);
        expect(getTransactionMethodDetails).not.toHaveBeenCalled();
        expect(storeTransactionMethodDetails).toHaveBeenCalledWith('123', 'hardhat', '0x123', null);
        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should store empty transactions token transfers if no transfers', async () => {
        getTokenTransfers.mockImplementationOnce(() => []);
        
        await processTransactions('123', 'hardhat', [Transaction]);

        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', []);
    });

    it('Should store empty method details if it fails', async () => {
        getContractData
            .mockImplementationOnce(() => {
                return new Promise((resolve) => {
                    resolve({ abi: TokenAbi })
                });
            });
        getTransactionMethodDetails.mockImplementationOnce(() => { throw 'Error'; });

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(getTransactionMethodDetails).toHaveBeenCalled();
        expect(storeTransactionMethodDetails).toHaveBeenCalledWith('123', 'hardhat', '0x123', null);
    });

    it('Should store empty token transfer if it fails', async () => {
        getTokenTransfers.mockImplementationOnce(() => { throw 'Error'; });

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', []);
    });
});
