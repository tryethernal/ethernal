require('../mocks/models');
require('../mocks/lib/analytics');
require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/crypto');
require('../mocks/lib/stripe');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/lib/errors');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/passportLocalStrategy');

const express = require('express');
const supertest = require('supertest');

const db = require('../../lib/firebase');
const { unmanagedError } = require('../../lib/errors');

const app = express();
app.use(express.json());
app.use('/opWithdrawals', require('../../api/opWithdrawals'));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(400).json({ error: error.message });
});

const request = supertest(app);
const BASE_URL = '/opWithdrawals';

describe('OpWithdrawals API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        unmanagedError.mockImplementation((error, req, next) => {
            if (next && typeof next === 'function') {
                next(error);
            }
        });
    });

    describe(`GET ${BASE_URL}`, () => {
        it('should return paginated list of OP withdrawals', (done) => {
            const mockData = {
                rows: [
                    { id: 1, withdrawalHash: '0xabc', status: 'initiated' },
                    { id: 2, withdrawalHash: '0xdef', status: 'finalized' }
                ],
                count: 30
            };

            db.getWorkspaceOpWithdrawals.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .query({ page: 1, itemsPerPage: 10, order: 'DESC' })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: mockData.rows,
                        total: 30
                    });
                    done();
                })
                .catch(done);
        });

        it('should handle errors', (done) => {
            const error = new Error('Database error');
            db.getWorkspaceOpWithdrawals.mockRejectedValue(error);

            request.get(`${BASE_URL}`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Database error' });
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:hash`, () => {
        it('should return withdrawal by L2 hash', (done) => {
            const mockWithdrawal = {
                id: 1,
                l2TransactionHash: '0xabc',
                withdrawalHash: '0xdef',
                status: 'proven'
            };

            db.getOpWithdrawalByL2Hash.mockResolvedValue(mockWithdrawal);

            request.get(`${BASE_URL}/0xabc`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockWithdrawal);
                    done();
                })
                .catch(done);
        });

        it('should handle withdrawal not found', (done) => {
            const error = new Error('Could not find withdrawal');
            db.getOpWithdrawalByL2Hash.mockRejectedValue(error);

            request.get(`${BASE_URL}/0x999`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Could not find withdrawal' });
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:hash/proof`, () => {
        it('should return withdrawal proof data', (done) => {
            const mockProof = {
                withdrawalHash: '0xabc',
                nonce: '1',
                sender: '0x123',
                target: '0x456',
                value: '1000000000000000000',
                status: 'initiated'
            };

            db.getOpWithdrawalProof.mockResolvedValue(mockProof);

            request.get(`${BASE_URL}/0xabc/proof`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockProof);
                    done();
                })
                .catch(done);
        });

        it('should handle proof not found', (done) => {
            const error = new Error('Could not find withdrawal');
            db.getOpWithdrawalProof.mockRejectedValue(error);

            request.get(`${BASE_URL}/0x999/proof`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Could not find withdrawal' });
                    done();
                })
                .catch(done);
        });
    });
});
