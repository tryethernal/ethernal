require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/lib/tasks');
require('../mocks/middlewares/taskAuth');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { enqueueTask } = require('../../lib/tasks');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/transactionSync';

afterEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should store the transaction', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });

        request.post(BASE_URL)
            .send({ data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: '0xabcd' },
                timestamp: 123
            }})
            .expect(200)
            .then(() => {
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

        request.post(BASE_URL)
            .send({ data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: null },
                timestamp: 123
            }})
            .expect(200)
            .then(() => {
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

        request.post(BASE_URL)
            .send({ data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: null },
                timestamp: 123
            }})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should enqueue transaction processing task', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ id: 1, name: 'My Workspace' });

        request.post(BASE_URL)
            .send({ data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123', to: '0xabcd' },
                timestamp: 123
            }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenCalledWith('transactionProcessing', {
                    userId: '123',
                    workspace: 'My Workspace',
                    transaction: {
                        hash: '0x123',
                        to: '0xabcd',
                        receipt: { status: 1 },
                        timestamp: 123,
                    },
                    secret: '123'
                });
                done();
            });
    });
});
