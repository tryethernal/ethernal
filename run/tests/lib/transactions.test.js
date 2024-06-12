require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/utils');
require('../mocks/lib/abi');
require('../mocks/lib/ethers');
require('../mocks/lib/trace');
require('../mocks/lib/rpc');

const db = require('../../lib/firebase');
const { getTokenTransfer } = require('../../lib/abi');
const { Tracer, getProvider, ContractConnector } = require('../../lib/rpc');
const { processTransactions } = require('../../lib/transactions');

const AmalfiContract = require('../fixtures/AmalfiContract.json');
const TokenAbi = require('../fixtures/ABI.json');
const Transaction = require('../fixtures/Transaction.json');
const TransactionReceipt = require('../fixtures/TransactionReceipt.json');

beforeEach(() => jest.clearAllMocks());

const workspace = {
    id: 1,
    name: 'hardhat',
    user: { id: 1, firebaseUserId: '123' }
};

describe('processTransactions ', () => {
    getTokenTransfer.mockReturnValue({ token: '0x123', src: '0x456', dst: '0x789' });
    jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ rpcServer: 'http://localhost:8545', public: true, name: 'hardhat' });

    it('Should store a parsed failed transaction error return by the rpc call', async () => {
        getProvider.mockImplementation(() => ({
            call: jest.fn().mockResolvedValue('0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a48656c6c6f6f6f6f6f6f00000000000000000000000000000000000000000000')
        }));

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction }, workspace };
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await processTransactions([1]);

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace };
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await processTransactions([1]);

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace };
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await processTransactions([1]);

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace };
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await processTransactions([1]);

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: false, message: { message: 'Helloooooo' } });
    });

    it('Should process & store the trace if the workspace is public', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        const saveTraceMock = jest.spyOn(Tracer.prototype, 'saveTrace');
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'http://localhost.com', tracing: 'other', public: true });

        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        await processTransactions([1]);

        expect(processTraceMock).toHaveBeenCalledWith({ ...Transaction, workspace });
        expect(saveTraceMock).toHaveBeenCalledWith('123', 'hardhat');
    });

    it('Should not process the trace for private workspaces', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'http://localhost:8545', public: false });

        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        await processTransactions([1]);

        expect(processTraceMock).not.toHaveBeenCalledWith(Transaction);
    });

    it('Should store token as new contracts if workspace is public', async () => {
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValueOnce(true);
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({
            ...Transaction,
            tokenTransfers: [{ token: '0x123', src: '0x456', dst: '0x789' }],
            receipt: TransactionReceipt,
            workspace
        });

        await processTransactions([1]);
        expect(db.storeContractData).toHaveBeenCalledTimes(1);
    });

    it('Should not store token as new contracts if wokrspace is private', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ public: false });

        getTokenTransfer.mockReturnValue({ token: '0x123', src: '0x456', dst: '0x789' });
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        await processTransactions([1]);

        expect(db.storeContractData).not.toHaveBeenCalled();
    });
});
