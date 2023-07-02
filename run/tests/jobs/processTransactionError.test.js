require('../mocks/lib/firebase');
require('../mocks/lib/utils');
require('../mocks/lib/trace');
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/ethers');

const db = require('../../lib/firebase');
const { getProvider } = require('../../lib/rpc');

const Transaction = require('../fixtures/Transaction.json');
const processTransactionError = require('../../jobs/processTransactionError');

beforeEach(() => jest.clearAllMocks());

const workspace = {
    id: 1,
    name: 'hardhat',
    rpcServer: 'http://test.com',
    user: { id: 1, firebaseUserId: '123' }
};

describe('processTransactionError', () => {
    it('Should store a parsed failed transaction error return by the rpc call', async () => {
        getProvider.mockImplementationOnce(() => ({
            call: jest.fn().mockResolvedValueOnce('0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a48656c6c6f6f6f6f6f6f00000000000000000000000000000000000000000000')
        }));

        const transaction = { ...Transaction, receipt: { status: 0, ...Transaction }, workspace: { ...workspace, public: true }};
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce(transaction);

        await processTransactionError({ data: { transactionId: 1 }});

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

        await processTransactionError({ data: { transactionId: 1 }});

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

        await processTransactionError({ data: { transactionId: 1 }});

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

        await processTransactionError({ data: { transactionId: 1 }});

        expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'hardhat', Transaction.hash, { parsed: false, message: { message: 'Helloooooo' } });
    });

    it('Should not process the error for private workspaces', async () => {
        jest.spyOn(db, 'getTransactionForProcessing').mockResolvedValueOnce({ ...Transaction, workspace });

        const res = await processTransactionError({ data: { transactionId: 1 }});

        expect(db.storeFailedTransactionError).not.toHaveBeenCalled();
        expect(res).toEqual('Not allowed on private workspaces');
    });
});