jest.mock('ioredis');
require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/gas';

describe('GET /stats', () => {
    it('Should return gas stats', (done) => {
        jest.spyOn(db, 'getLatestGasStats').mockResolvedValueOnce({
            blockNumber: 10,
            averageBlockSize: 10,
            averageUtilization: 10,
            averageBlockTime: 10,
            latestBlockNumber: 10,
            baseFeePerGas: 10,
            priorityFeePerGas: 10
        });

        request.get(`${BASE_URL}/stats`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    blockNumber: 10,
                    averageBlockSize: 10,
                    averageUtilization: 10,
                    averageBlockTime: 10,
                    latestBlockNumber: 10,
                    baseFeePerGas: 10,
                    priorityFeePerGas: 10
                });
                done();
            });
    });
});

describe('GET /priceHistory', () => {
    it('Should return gas price history', (done) => {
        jest.spyOn(db, 'getGasPriceHistory').mockResolvedValueOnce([]);

        request.get(`${BASE_URL}/priceHistory`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });
});

describe('GET /limitHistory', () => {
    it('Should return gas limit history', (done) => {
        jest.spyOn(db, 'getGasLimitHistory').mockResolvedValueOnce([]);

        request.get(`${BASE_URL}/limitHistory`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });
});

describe('GET /utilizationRatioHistory', () => {
    it('Should return gas utilization ratio history', (done) => {
        jest.spyOn(db, 'getGasUtilizationRatioHistory').mockResolvedValueOnce([]);

        request.get(`${BASE_URL}/utilizationRatioHistory`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });
});

describe('GET /consumers', () => {
    it('Should return latest gas consumers', (done) => {
        jest.spyOn(db, 'getLatestGasConsumers').mockResolvedValueOnce([]);

        request.get(`${BASE_URL}/consumers`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });
});

describe('GET /spenders', () => {
    it('Should return latest gas spenders', (done) => {
        jest.spyOn(db, 'getLatestGasSpenders').mockResolvedValueOnce([]);

        request.get(`${BASE_URL}/spenders`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });
});
