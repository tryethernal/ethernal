require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { enqueue } = require('../../lib/queue');

const transactionSync = require('../../jobs/transactionSync');

beforeEach(() => {
    jest.spyOn(db, 'storeTransaction').mockResolvedValueOnce({ id: 1 });
});

afterEach(() => jest.clearAllMocks());

describe('transactionSync', () => {
    it('Should store the transaction', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });

        transactionSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: '0xabcd' },
                timestamp: 123
            }
        }).then(() => {
            expect(db.storeTransaction).toHaveBeenCalledWith('123', 'My Workspace', {
                hash: '0x123',
                to: '0xabcd',
                receipt: { status: 1 },
                timestamp: 123,
            });
            done();
        });
    });

    it('Should sync the deployed contract if allowed', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(true);

        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn()
                .mockResolvedValue({
                    contractAddress: '0xabcd',
                    status: 1
                })
        }));

        transactionSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: null },
                timestamp: 123
            }
        }).then(() => {
            expect(db.storeContractData).toHaveBeenCalledWith('123', 'My Workspace', '0xabcd', {
                address: '0xabcd',
                timestamp: 123,
            });
            done();
        });
    });

    it('Should not sync the deployed contract if not allowed', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(false);

        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn()
                .mockResolvedValue({
                    contractAddress: '0xabcd',
                    status: 1
                })
        }));

        transactionSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: null },
                timestamp: 123
            }
        }).then(() => {
            expect(db.storeContractData).not.toHaveBeenCalled();
            done();
        });
    });

    it('Should enqueue transaction processing task', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });

        transactionSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: '0xabcd' },
                timestamp: 123
            }
        }).then(() => {
            expect(enqueue).toHaveBeenCalledWith('transactionProcessing', expect.anything(), { transactionId: 1 });
            done();
        });
    });
});
