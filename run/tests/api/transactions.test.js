require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/queue');
require('../mocks/lib/codeRunner');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/browserSync');
const db = require('../../lib/firebase');
const { processTransactions } = require('../../lib/transactions');
const codeRunner = require('../../lib/codeRunner');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/transactions';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/:hash/tokenTransfers`, () => {
    it('Should return token transfers list', (done) => {
        jest.spyOn(db, 'getTransactionTokenTransfers').mockResolvedValueOnce({ total: 1, items: [{ hash: '0x123' }]});

        request.get(`${BASE_URL}/:hash/tokenTransfers`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ total: 1, items: [{ hash: '0x123' }]});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/failedProcessable`, () => {
    it('Should return failed non processed transactions', (done) => {
        jest.spyOn(db, 'getFailedProcessableTransactions').mockResolvedValueOnce([{ hash: '0x123' }]);

        request.get(`${BASE_URL}/failedProcessable`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ hash: '0x123' }]);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/processable`, () => {
    it('Should return non processed transactions', (done) => {
        jest.spyOn(db, 'getProcessableTransactions').mockResolvedValueOnce([{ hash: '0x123' }]);
        
        request.get(`${BASE_URL}/processable`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ hash: '0x123' }]);
                done();
            })
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return transactions list', (done) => {
        jest.spyOn(db, 'getWorkspaceTransactions').mockResolvedValueOnce({
            items: [{ hash: '1234' }, { hash: 'abcd' }],
            total: 2
        });
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [{ hash: '1234' }, { hash: 'abcd' }],
                    total: 2
                });
                done();
            })
    });
});

describe(`GET ${BASE_URL}/:hash`, () => {
    it('Should return individual transaction', (done) => {
        jest.spyOn(db, 'getWorkspaceTransaction').mockResolvedValue({
            hash: '1234'
        });
        request.get(`${BASE_URL}/1234`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ hash: '1234', extraFields: [] });
                done();
            });
    });

    it('Should return individual transaction with extra fields', (done) => {
        jest.spyOn(db, 'getWorkspaceTransaction').mockResolvedValue({
            hash: '1234'
        });
        jest.spyOn(db, 'getCustomTransactionFunction').mockReturnValue(function() { return 'ok' });
        jest.spyOn(codeRunner, 'transactionFn').mockResolvedValueOnce({ overrides: { hash: '6789' }, extraFields: [{ field: 'ok' }]});
        request.get(`${BASE_URL}/1234`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ hash: '6789', extraFields: [{ field: 'ok' }]});
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:hash/storage`, () => {
    it('Should return 200 status', (done) => {
        request.post(`${BASE_URL}/1234/storage`)
            .send({ data: { workspace: 'My Workspace', data: [{ my: 'data' }]}})
            .expect(200, done);
    });
});

describe(`POST ${BASE_URL}/:hash/trace`, () => {
    it('Should store contract data, store trace & return 200 status', (done) => {
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(true);
        request.post(`${BASE_URL}/1234/trace`)
            .send({ data: { workspace: 'My Workspace', steps: [{ op: 'CALL', address: '0x1' }]}})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).toHaveBeenCalled();
                expect(db.storeTrace).toHaveBeenCalledWith('123', 'My Workspace', '1234', [{ op: 'CALL', address: '0x1' }]);
                done();
            });
    });

    it('Should not store contract data, store trace & return 200 status', (done) => {
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(false);
        request.post(`${BASE_URL}/1234/trace`)
            .send({ data: { workspace: 'My Workspace', steps: [{ op: 'CALL', address: '0x1' }]}})
            .expect(200)
            .then(() => {
                expect(db.storeContractData).not.toHaveBeenCalled();
                expect(db.storeTrace).toHaveBeenCalledWith('123', 'My Workspace', '1234', [{ op: 'CALL', address: '0x1' }]);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:hash/tokenBalanceChanges`, () => {
    it('Should return 200 status', (done) => {
        request.post(`${BASE_URL}/1234/tokenBalanceChanges`)
            .send({ data: { workspace: 'My Workspace', tokenTransferId: 1, changes: [{ token: '0x123', address: '0x456', currentBalance: '0', previousBalance: '1', diff: '-1' }]}})
            .expect(200)
            .then(() => {
                expect(db.storeTokenBalanceChanges).toHaveBeenCalledWith('123', 'My Workspace', 1, [{ token: '0x123', address: '0x456', currentBalance: '0', previousBalance: '1', diff: '-1' }]);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:hash/process`, () => {
    it('Should return 200 status', (done) => {
        jest.spyOn(db, 'getTransaction').mockResolvedValue({ id: 1234 });
        request.post(`${BASE_URL}/1234/process`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(processTransactions).toHaveBeenCalledWith([1234]);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:hash/error`, () => {
    it('Should return 200 status', (done) => {
        request.post(`${BASE_URL}/1234/error`)
            .send({ data: { workspace: 'My Workspace', error: { message: 'Wrong params' }}})
            .expect(200)
            .then(() => {
                expect(db.storeFailedTransactionError).toHaveBeenCalledWith('123', 'My Workspace', '1234', { message: 'Wrong params' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}`, () => {
    it('Should return 200 status and not store contract data if it is not a deployment', (done) => {
        request.post(BASE_URL)
            .send({
                data: { 
                    workspace: 'My Workspace',
                    block: { timestamp: 123456 },
                    transaction: {
                        hash: '1234',
                    },
                    transactionReceipt: {
                        to: '0x1234'
                    }
                }
            })
            .expect(200)
            .then(() => {
                expect(db.storeTransaction).toHaveBeenCalledWith(
                    '123',
                    'My Workspace',
                    {
                        hash: '1234',
                        receipt: { to: '0x1234' },
                        timestamp: 123456
                    }
                );
                done();
            });
    });

    it('Should return 200 status and store contract data if it is not deployment', (done) => {
        jest.spyOn(db, 'canUserSyncContract').mockResolvedValue(true);
        request.post(BASE_URL)
            .send({
                data: { 
                    workspace: 'My Workspace',
                    block: { timestamp: 123456 },
                    transaction: {
                        hash: '1234',
                    },
                    transactionReceipt: {
                        contractAddress: '0x1234'
                    }
                }
            })
            .expect(200)
            .then(() => {
                expect(db.storeTransaction).toHaveBeenCalledWith(
                    '123',
                    'My Workspace',
                    {
                        hash: '1234',
                        receipt: { contractAddress: '0x1234' },
                        timestamp: 123456
                    }
                );
                done();
            });
    });
});

