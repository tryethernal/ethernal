require('../mocks/lib/firebase');
require('../mocks/lib/utils');
require('../mocks/lib/abi');
require('../mocks/lib/ethers');
require('../mocks/lib/trace');
require('../mocks/lib/rpc');

const db = require('../../lib/firebase');
const { getTokenTransfers } = require('../../lib/abi');
const { Tracer, getProvider, ContractConnector } = require('../../lib/rpc');
const { processTransactions } = require('../../lib/transactions');

const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TokenAbi = require('../fixtures/ABI.json');
const Transaction = require('../fixtures/TransactionReceipt.json');

beforeEach(() => jest.clearAllMocks());

describe('processTransactions ', () => {
    getTokenTransfers.mockReturnValue([{ token: '0x123', src: '0x456', dst: '0x789' }]);
    jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ rpcServer: 'http://localhost:8545', public: true, name: 'hardhat' });

    it('Should store a parsed failed transaction error return by the rpc call', async () => {
        getProvider.mockImplementation(() => ({
            call: jest.fn().mockResolvedValue('0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a48656c6c6f6f6f6f6f6f00000000000000000000000000000000000000000000')
        }));

        await processTransactions('123', 'hardhat', [{ ...Transaction, receipt: { status: 0, ...Transaction.receipt }}]);

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: true, message: 'Helloooooo\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000' });
    });

    it('Should store a parsed failed transaction error thrown', async () => {
        getProvider.mockImplementationOnce(() => ({
            call: jest.fn().mockRejectedValue({
                response: JSON.stringify({
                    error: { message: 'Helloooooo' }
                })
            })
        }));

        await processTransactions('123', 'hardhat', [{ ...Transaction, receipt: { status: 0, ...Transaction.receipt }}]);

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: true, message: 'Helloooooo' });
    });

    it('Should store a raw failed transaction error thrown', async () => {
        getProvider.mockImplementationOnce(() => ({
            call: jest.fn().mockRejectedValue({
                response: JSON.stringify({
                    error: { message2: 'Helloooooo' }
                })
            })
        }));

        await processTransactions('123', 'hardhat', [{ ...Transaction, receipt: { status: 0, ...Transaction.receipt }}]);

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: false, message: { error: { message2: 'Helloooooo' }} });
    });

    it('Should store a raw failed transaction error thrown without a response object', async () => {
        getProvider.mockImplementationOnce(() => ({
            call: jest.fn().mockRejectedValue({
               response: JSON.stringify({
                   message: 'Helloooooo'
               })
            })
        }));

        await processTransactions('123', 'hardhat', [{ ...Transaction, receipt: { status: 0, ...Transaction.receipt }}]);

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: false, message: { message: 'Helloooooo' } });
    });

    it('Should process & store the trace if the workspace is public', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        const saveTraceMock = jest.spyOn(Tracer.prototype, 'saveTrace');

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(processTraceMock).toHaveBeenCalledWith(Transaction);
        expect(saveTraceMock).toHaveBeenCalledWith('123', 'hardhat');
    });

    it('Should not process the trace for private workspaces', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'http://localhost:8545', public: false });

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(processTraceMock).not.toHaveBeenCalledWith(Transaction);
    });

    it('Should get contract data from to, get proxy data, store transaction details & store token transfers, and not fetch balances if workspace is not public ', async () => {
        jest.spyOn(db, 'getContractData')
            .mockResolvedValueOnce({ proxy: '0x123' })
            .mockResolvedValueOnce({ abi: TokenAbi });
        getTokenTransfers.mockReturnValueOnce(['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.getContractData).toHaveBeenCalledTimes(2);
        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(db.storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should store token as new contracts if workspace is public', async () => {
        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);
        expect(db.storeContractData).toHaveBeenCalledTimes(1);
    });

    it('Should not store token as new contracts if wokrspace is private', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ public: false });

        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.storeContractData).not.toHaveBeenCalled();
    });

    it('Should store empty transaction details & store token transfers when no to', async () => {
        const transaction = {
            ...Transaction,
            to: null
        };

        getTokenTransfers.mockImplementationOnce(() => ['transfer']);

        await processTransactions('123', 'hardhat', [transaction]);

        expect(db.getContractData).not.toHaveBeenCalled();
        expect(getTokenTransfers).toHaveBeenCalledWith(transaction);
        expect(db.storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should store token transfers when no contracts @to', async () => {
        jest.spyOn(db, 'getContractData').mockResolvedValueOnce(null);
        getTokenTransfers.mockReturnValueOnce(['transfer']);

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.getContractData).toHaveBeenCalledTimes(1);
        expect(getTokenTransfers).toHaveBeenCalledWith(Transaction);
        expect(db.storeTransactionTokenTransfers).toHaveBeenCalledWith('123', 'hardhat', '0x123', ['transfer']);
    });

    it('Should fetch balance changes if workspace is public and store them if there are any', async () => {
        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.storeTokenBalanceChanges).toHaveBeenCalledWith('123', 'hardhat', '0x123', { '0x123': [
            { address: '0x456', currentBalance: '1', previousBalance: '1', diff: '0' },
            { address: '0x789', currentBalance: '1', previousBalance: '1', diff: '0' }
        ] });
    });

    it('Should not fetch balance changes if workspace is not public', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ public: false });

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.storeTokenBalanceChanges).not.toHaveBeenCalledWith();
    });

    it('Should not store anything if balance changes calls fail', async () => {
        ContractConnector.mockImplementationOnce(() => ({
            callReadMethod: jest.fn()
                .mockRejectedValue('error')
        }));

        await processTransactions('123', 'hardhat', [Transaction]);

        expect(db.storeTokenBalanceChanges).not.toHaveBeenCalledWith();
    });
});
