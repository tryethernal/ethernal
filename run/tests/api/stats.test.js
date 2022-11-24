require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');
const workspaceAuthMiddleware = require('../../middlewares/workspaceAuth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/stats';

describe(`GET /wallets`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return an error if workspace is not public', (done) => {
        request.get(`${BASE_URL}/wallets?from=2022-04-05&to=2022-06-05`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('[GET /api/stats/wallets] This endpoint is not available on private workspaces.');
                done();
            });
    });

    it('Should return wallet volume', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getWalletVolume').mockResolvedValueOnce([{ timestamp: '2022-04-05', count: 1 }]);

        request.get(`${BASE_URL}/wallets?from=2022-04-05&to=2022-06-05`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', count: 1 }]);
                done();
            });
    });
});

describe(`GET /transactions`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return an error if workspace is not public', (done) => {
        request.get(`${BASE_URL}/transactions?from=2022-04-05&to=2022-06-05`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('[GET /api/stats/transactions] This endpoint is not available on private workspaces.');
                done();
            });
    });

    it('Should return transactions volume', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTransactionVolume').mockResolvedValueOnce([{ timestamp: '2022-04-05', count: 1 }]);

        request.get(`${BASE_URL}/transactions?from=2022-04-05&to=2022-06-05`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ timestamp: '2022-04-05', count: 1 }]);
                done();
            });
    });
});

describe(`GET /global`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return an error if workspace is not public', (done) => {
        request.get(`${BASE_URL}/global`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('[GET /api/stats/global] This endpoint is not available on private workspaces.');
                done();
            });
    });

    it('Should return global stats', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTxCount').mockResolvedValueOnce(10);
        jest.spyOn(db, 'getTotalTxCount').mockResolvedValueOnce(100);
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
