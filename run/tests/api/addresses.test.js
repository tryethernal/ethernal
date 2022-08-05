require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/addresses';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/:address/balances`, () => {
    it('Should return the list of token balances', (done) => {
        jest.spyOn(db, 'getAddressLatestTokenBalances').mockResolvedValueOnce([{ id: 1, token: '0xabcd' }]);
        request.get(`${BASE_URL}/0x123/balances`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ id: 1, token: '0xabcd' }]);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/transactions`, () => {
    it('Should return a paginated list of transactions', (done) => {
        jest.spyOn(db, 'getAddressTransactions').mockResolvedValueOnce({ page: 1, total: 1, items: [{ hash: '0x123' }]});
        request.get(`${BASE_URL}/0x123/transactions`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ page: 1, total: 1, items: [{ hash: '0x123' }]});
                done();
            });
    });
});

