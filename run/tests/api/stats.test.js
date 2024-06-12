require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');
const workspaceAuthMiddleware = require('../../middlewares/workspaceAuth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/stats';

describe(`GET /transactions`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return transactions volume', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTransactionVolume').mockResolvedValueOnce([{ timestamp: '2022-04-05', count: 1 }]);

        request.get(`${BASE_URL}/transactions?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', count: 1 }]);
                done();
            });
    });
});

describe(`GET /tokenTransferVolume`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return token transfer volume', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTokenTransferVolume').mockResolvedValueOnce([{ timestamp: '2022-04-05', count: 1 }]);

        request.get(`${BASE_URL}/tokenTransferVolume?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', count: 1 }]);
                done();
            });
    });
});

describe(`GET /uniqueWalletCount`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return unique wallets count', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getUniqueWalletCount').mockResolvedValueOnce([{ timestamp: '2022-04-05', count: 1 }]);

        request.get(`${BASE_URL}/uniqueWalletCount?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', count: 1 }]);
                done();
            });
    });
});

describe(`GET /averageGasPrice`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return average gas price', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getAverageGasPrice').mockResolvedValueOnce([{ timestamp: '2022-04-05', amount: 1 }]);

        request.get(`${BASE_URL}/averageGasPrice?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', amount: 1 }]);
                done();
            });
    });
});

describe(`GET /averageTransactionFee`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return average transaction fee', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getAverageTransactionFee').mockResolvedValueOnce([{ timestamp: '2022-04-05', amount: 1 }]);

        request.get(`${BASE_URL}/averageTransactionFee?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', amount: 1 }]);
                done();
            });
    });
});

describe(`GET /global`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return global stats', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTotalTxCount')
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(100);
        jest.spyOn(db, 'getActiveWalletCount').mockResolvedValueOnce(15);

        request.get(`${BASE_URL}/global`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    txCount24h: 10,
                    txCountTotal: 100,
                    activeWalletCount: 15
                });
                done();
            });
    });
});
