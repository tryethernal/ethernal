const rewire = require('rewire')

jest.mock('../../lib/firebase', () => ({
    getContractData: jest.fn(),
    storeTransactionMethodDetails: jest.fn(),
    storeTransactionTokenTransfers: jest.fn(),
    getWorkspaceByName: jest.fn().mockResolvedValue({ public: false }),
    storeTokenBalanceChanges: jest.fn()
}));

jest.mock('../../lib/utils', () => ({
    getFunctionSignatureForTransaction: jest.fn()
}));

jest.mock('../../lib/abi', () => ({
    getTokenTransfers: jest.fn(),
    getTransactionMethodDetails: jest.fn()
}));

jest.mock('../../lib/rpc');

const { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers, getWorkspaceByName, storeTokenBalanceChanges } = require('../../lib/firebase');
const { getTokenTransfers, getTransactionMethodDetails } = require('../../lib/abi');
const { Tracer } = require('../../lib/rpc');

const wiredTransactions = rewire('../../lib/transactions');
wiredTransactions.__set__({
    getBalanceChange: jest.fn().mockResolvedValue({ before: 1, after: 2 }),
    getTokenTransfers: jest.fn().mockReturnValueOnce([{ token: '0x123', src: '0x456', dst: '0x789' }]),
    getWorkspaceByName: jest.fn().mockResolvedValueOnce({ public: true, name: 'hardhat' }),
    getTransactionMethodDetails: jest.fn(),
    storeTransactionMethodDetails: jest.fn(),
    storeTokenBalanceChanges: jest.fn()
});
const { processTransactions } = require('../../lib/transactions');

const Helper = require('../helper');

const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TokenAbi = require('../fixtures/ABI.json');
const Transaction = require('../fixtures/TransactionReceipt.json');
let helper;

describe('processTransactions ', () => {
    beforeEach(jest.clearAllMocks);

    it('Should process & store the trace if the workspace is public', async () => {
        getWorkspaceByName
            .mockResolvedValueOnce({ rpcServer: 'https://remoterpc.com', public: true });

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(Tracer.prototype.process).toHaveBeenCalledWith(Transaction);
        expect(Tracer.prototype.saveTrace).toHaveBeenCalledWith('123', 'hardhat');
    });

    it('Should not process the trace for private workspaces', async () => {
        await processTransactions('123', 'hardhat', [Transaction]);

        expect(Tracer.prototype.process).not.toHaveBeenCalledWith(Transaction);
    });

    it('Should get contract data from to, get proxy data, store transaction details & store token transfers, and not fetch balances if workspace is not public ', async () => {
        getContractData
            .mockResolvedValueOnce({ proxy: '0x123' })
            .mockResolvedValueOnce({ abi: TokenAbi });

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
        getContractData.mockResolvedValueOnce(null);
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
        getContractData.mockResolvedValueOnce({ abi: TokenAbi });
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

    it('Should fetch balance changes if workspace is public and store them if there are any', async () => {
        await wiredTransactions.processTransactions('123', 'hardhat', [Transaction]);

        expect(wiredTransactions.__get__('storeTokenBalanceChanges')).toHaveBeenCalledWith('123', 'hardhat', '0x123', { '0x123': [{ before: 1, after: 2 }, { before: 1, after: 2 }] });
    });

    it('Should not fetch balance changes if workspace is not public', async () => {
        wiredTransactions.__set__({
            getWorkspaceByName: jest.fn().mockResolvedValue({ public: false })
        });
        await wiredTransactions.processTransactions('123', 'hardhat', [Transaction]);

        expect(wiredTransactions.__get__('storeTokenBalanceChanges')).not.toHaveBeenCalledWith();
    });

    it('Should not store anything if balance changes calls fail', async () => {
        wiredTransactions.__set__({
            getBalanceChange: jest.fn().mockResolvedValue(null),
        });
        await wiredTransactions.processTransactions('123', 'hardhat', [Transaction]);

        expect(wiredTransactions.__get__('storeTokenBalanceChanges')).not.toHaveBeenCalledWith();
    });
});
