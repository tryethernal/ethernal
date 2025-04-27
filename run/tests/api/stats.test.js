jest.mock('ioredis');
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

describe(`GET ${BASE_URL}/topTokensByHolders`, () => {
    it('Should return top tokens by holders', (done) => {
        jest.spyOn(db, 'getTopTokensByHolders').mockResolvedValueOnce([{ id: 1, name: 'Ethernal' }]);
        request.get(`${BASE_URL}/topTokensByHolders`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{ id: 1, name: 'Ethernal' }] });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/contracts`, () => {
    it('Should return contracts', (done) => {
        jest.spyOn(db, 'getWorkspaceContractStats').mockResolvedValueOnce({
            totalContracts: 1,
            contractsLast24Hours: 1,
            verifiedContracts: 1,
            verifiedContractsLast24Hours: 1
        });
        request.get(`${BASE_URL}/contracts`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ stats: {
                    totalContracts: 1,
                    contractsLast24Hours: 1,
                    verifiedContracts: 1,
                    verifiedContractsLast24Hours: 1
                } });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/last24hBurntFees`, () => {
    it('Should return burnt fees 24h', (done) => {
        jest.spyOn(db, 'getLast24hBurntFees').mockResolvedValueOnce(1);
        request.get(`${BASE_URL}/last24hBurntFees`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ burntFees: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/last24hTotalGasUsed`, () => {
    it('Should return total gas used 24h', (done) => {
        jest.spyOn(db, 'getLast24hTotalGasUsed').mockResolvedValueOnce(1);
        request.get(`${BASE_URL}/last24hTotalGasUsed`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ totalGasUsed: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/gasUtilisationRatio24h`, () => {
    it('Should return gas utilization ratio 24h', (done) => {
        jest.spyOn(db, 'getLast24hGasUtilisationRatio').mockResolvedValueOnce(1);
        request.get(`${BASE_URL}/gasUtilisationRatio24h`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ gasUtilisationRatio24h: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/averageTransactionFee24h`, () => {
    it('Should return average transaction fee 24h', (done) => {
        jest.spyOn(db, 'getLast24hAverageTransactionFee').mockResolvedValueOnce(1);
        request.get(`${BASE_URL}/averageTransactionFee24h`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ avgTransactionFee24h: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/transactionFee24h`, () => {
    it('Should return transaction fee 24h', (done) => {
        jest.spyOn(db, 'getLast24hTransactionFees').mockResolvedValueOnce(1);
        request.get(`${BASE_URL}/transactionFee24h`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ transactionFee24h: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/transactionFeeHistory`, () => {
    it('Should return transaction fee history', (done) => {
        jest.spyOn(db, 'getTransactionFeeHistory').mockResolvedValueOnce([{ day: '2022-04-05', transactionFees: 1 }]);
        request.get(`${BASE_URL}/transactionFeeHistory?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ day: '2022-04-05', transactionFees: 1 }]);
                done();
            });
    });
});

describe(`GET /blockSizeHistory`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return block size history', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getBlockSizeHistory').mockResolvedValueOnce([{ day: '2022-04-05', size: 1 }]);

        request.get(`${BASE_URL}/blockSizeHistory?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ day: '2022-04-05', size: 1 }]);
                done();
            });
    });
});

describe(`GET /blockTimeHistory`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return block time history', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getBlockTimeHistory').mockResolvedValueOnce([{ day: '2022-04-05', blockTime: 1 }]);

        request.get(`${BASE_URL}/blockTimeHistory?from=2022-04-05&to=2022-04-15`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ day: '2022-04-05', blockTime: 1 }]);
                done();
            });
    });
});

describe(`GET /activeWalletCount`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return active wallet count', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getActiveWalletCount').mockResolvedValueOnce(10);

        request.get(`${BASE_URL}/activeWalletCount`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ count: 10 });
                done();
            });
    });
});

describe(`GET /txCountTotal`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return total tx count', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTotalTxCount').mockResolvedValueOnce(10);

        request.get(`${BASE_URL}/txCountTotal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ count: 10 });
                done();
            });
    });
});

describe(`GET /txCount24h`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 24h tx count', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace', public: true }
            next();
        });
        jest.spyOn(db, 'getTotalTxCount').mockResolvedValueOnce(10);

        request.get(`${BASE_URL}/txCount24h`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ count: 10 });
                done();
            });
    });
});

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
