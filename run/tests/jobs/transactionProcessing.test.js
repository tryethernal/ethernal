require('../mocks/lib/firebase');
require('../mocks/lib/utils');
require('../mocks/lib/trace');
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/ethers');

const db = require('../../lib/firebase');
const { Tracer, getProvider } = require('../../lib/rpc');

const Transaction = require('../fixtures/Transaction.json');
const TransactionReceipt = require('../fixtures/TransactionReceipt.json');
const transactionProcessing = require('../../jobs/transactionProcessing');

beforeEach(() => jest.clearAllMocks());

const workspace = {
    id: 1,
    name: 'hardhat',
    rpcServer: 'http://test.com',
    user: { id: 1, firebaseUserId: '123' }
};

describe('transactionProcessing', () => {
    it('Should store a parsed failed transaction error return by the rpc call', async () => {
        getProvider.mockImplementationOnce(() => ({
            call: jest.fn().mockResolvedValueOnce('0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a48656c6c6f6f6f6f6f6f00000000000000000000000000000000000000000000')
        }));

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction }, workspace: { ...workspace, public: true }};
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await transactionProcessing({ data: { transactionId: 1 }});

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace: { ...workspace, public: true }};
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await transactionProcessing({ data: { transactionId: 1 }});

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace: { ...workspace, public: true }};
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await transactionProcessing({ data: { transactionId: 1 }});

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

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction.receipt }, workspace: { ...workspace, public: true } };
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await transactionProcessing({ data: { transactionId: 1 }});

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: false, message: { message: 'Helloooooo' } });
    });

    it('Should process & store the trace if the workspace is public', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        const saveTraceMock = jest.spyOn(Tracer.prototype, 'saveTrace');
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace: { ...workspace, public: true, tracing: 'other' }});

        await transactionProcessing({ data: { transactionId: 1 }});

        expect(processTraceMock).toHaveBeenCalledWith({ ...Transaction, workspace: { ...workspace, public: true, tracing: 'other' } });
        expect(saveTraceMock).toHaveBeenCalledWith('123', 'hardhat');
    });

    it('Should not process the trace for private workspaces', async () => {
        const processTraceMock = jest.spyOn(Tracer.prototype, 'process');
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        await transactionProcessing({ data: { transactionId: 1 }});

        expect(processTraceMock).not.toHaveBeenCalledWith(Transaction);
    });

    it('Should store token as new contracts if workspace is public', async () => {
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(true);
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({
            ...Transaction,
            tokenTransfers: [{ token: '0x123', src: '0x456', dst: '0x789' }],
            receipt: TransactionReceipt,
            workspace: { ...workspace, public: true }
        });

        await transactionProcessing({ data: { transactionId: 1 }});
        expect(db.storeContractData).toHaveBeenCalledTimes(1);
    });

    it('Should not store token as new contracts if workspace is private', async () => {
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        await transactionProcessing({ data: { transactionId: 1 }});

        expect(db.storeContractData).not.toHaveBeenCalled();
    });
});
