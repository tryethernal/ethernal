require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/utils');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');
const { DexFactoryConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/v2_dexes';

beforeEach(() => {
    jest.clearAllMocks();
});

describe(`GET ${BASE_URL}/:id/status`, () => {
    it('Should return pairs sync status', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce({
            id: 1,
            explorer: { workspace: { rpcServer: 'server' }}
        });
        jest.spyOn(db, 'getV2DexPairCount').mockResolvedValueOnce(1);
        DexFactoryConnector.mockImplementation(() => ({
            allPairsLength: jest.fn().mockResolvedValueOnce('10')
        }));

        request.get(`${BASE_URL}/1/status`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ pairCount: 1, totalPairs: 10 });
                done();
            });
    });

    it('Should throw an error if could not find dex', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/status`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find dex');
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id`, () => {
    it('Should delete the dex', (done) => {
        jest.spyOn(db, 'deleteV2Dex').mockResolvedValueOnce();
        request.delete(`${BASE_URL}/1`)
            .expect(200)
            .then(() => {
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/deactivate`, () => {
    it('Should deactivate the dex', (done) => {
        jest.spyOn(db, 'deactivateV2Dex').mockResolvedValueOnce();
        request.put(`${BASE_URL}/1/deactivate`)
            .expect(200)
            .then(() => {
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/activate`, () => {
    it('Should activate the dex', (done) => {
        jest.spyOn(db, 'activateV2Dex').mockResolvedValueOnce();
        request.put(`${BASE_URL}/1/activate`)
            .expect(200)
            .then(() => {
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/pairs`, () => {
    it('Should throw an error if could not find dex', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/pairs`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find dex');
                done();
            });
    });

    it('Should return pairs', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'fetchPairsWithLatestReserves').mockResolvedValueOnce({ count: 1, pairs: [{ address: '0x123' }]});
        request.get(`${BASE_URL}/1/pairs`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ pairs: [{ address: '0x123' }], count: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/quote`, () => {
    it('Should throw an error if could not find dex', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/quote?from=0x123&to=0x456&amount=100`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find dex');
                done();
            });
    });

    it('Should return quote', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce({ id: 2 });
        jest.spyOn(db, 'getV2DexQuote').mockResolvedValueOnce([{ amount: 2 }]);
        request.get(`${BASE_URL}/1/quote?from=0x123&to=0x456&amount=100`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ quote: [{ amount: 2 }]});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/tokens`, () => {
    it('Should throw an error if could not find dex', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/tokens`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find dex');
                done();
            });
    });

    it('Should return tokens', (done) => {
        jest.spyOn(db, 'getExplorerV2Dex').mockResolvedValueOnce({ getAllTokens: jest.fn().mockResolvedValueOnce([{ address: '0x123' }])});
        request.get(`${BASE_URL}/1/tokens`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ tokens: [{ address: '0x123' }]});
                done();
            });
    });
});
