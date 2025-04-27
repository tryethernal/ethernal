require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/lib/rpc');
const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/addresses';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/:address/spentTransactionFeeHistory`, () => {
    it('Should return a paginated list of spent transaction fees', (done) => {
        jest.spyOn(db, 'getAddressSpentTransactionFeeHistory').mockResolvedValueOnce({ items: [{
            hash: '0x123',
            value: '1000000000000000000'
        }]});
        request.get(`${BASE_URL}/0x123/spentTransactionFeeHistory?from=2021-01-01&to=2021-01-02`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{
                    hash: '0x123',
                    value: '1000000000000000000'
                }]});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/transactionHistory`, () => {
    it('Should return a paginated list of transactions', (done) => {
        jest.spyOn(db, 'getAddressTransactionHistory').mockResolvedValueOnce({ items: [{
            hash: '0x123',
            value: '1000000000000000000'
        }]});
        request.get(`${BASE_URL}/0x123/transactionHistory?from=2021-01-01&to=2021-01-02`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{
                    hash: '0x123',
                    value: '1000000000000000000'
                }]});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/internalTransactions`, () => {
    it('Should return a paginated list of internal transactions', (done) => {
        jest.spyOn(db, 'getAddressTransactionTraceSteps').mockResolvedValueOnce([{
            src: '0x123',
            dst: '0x456',
            value: '1000000000000000000'
        }]);
        request.get(`${BASE_URL}/0x123/internalTransactions`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{
                    src: '0x123',
                    dst: '0x456',
                    value: '1000000000000000000'
                }] });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/nativeTokenBalance`, () => {
    it('Should return the native token balance', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            getBalance: jest.fn().mockResolvedValue('1000000000000000000')
        }));
        request.get(`${BASE_URL}/0x123/nativeTokenBalance`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ balance: '1000000000000000000' });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/tokenTransfers`, () => {
    it('Should return address token transfers', (done) => {
        jest.spyOn(db, 'getAddressTokenTransfers').mockResolvedValueOnce({ items: [], count: 0});
        request.get(`${BASE_URL}/0x123/tokenTransfers`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [], count: 0});
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:address/stats`, () => {
    it('Should return token stats', (done) => {
        jest.spyOn(db, 'getAddressTransactionStats').mockResolvedValueOnce({ sentTransactionCount: 20 });
        request.get(`${BASE_URL}/0x123/stats`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ sentTransactionCount: 20 });
                done();
            });
    });
});

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

