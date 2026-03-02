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
app.use('/opDeposits', require('../../api/opDeposits'));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(400).json({ error: error.message });
});

const request = supertest(app);
const BASE_URL = '/opDeposits';

describe('OpDeposits API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        unmanagedError.mockImplementation((error, req, next) => {
            if (next && typeof next === 'function') {
                next(error);
            }
        });
    });

    describe(`GET ${BASE_URL}`, () => {
        it('should return paginated list of OP deposits', (done) => {
            const mockData = {
                rows: [
                    { id: 1, l1TransactionHash: '0xabc', status: 'pending' },
                    { id: 2, l1TransactionHash: '0xdef', status: 'confirmed' }
                ],
                count: 25
            };

            db.getWorkspaceOpDeposits.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .query({ page: 1, itemsPerPage: 10, order: 'DESC' })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: mockData.rows,
                        total: 25
                    });
                    done();
                })
                .catch(done);
        });

        it('should handle errors', (done) => {
            const error = new Error('Database error');
            db.getWorkspaceOpDeposits.mockRejectedValue(error);

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
        it('should return deposit by L1 hash', (done) => {
            const mockDeposit = {
                id: 1,
                l1TransactionHash: '0xabc',
                l2TransactionHash: '0xdef',
                status: 'confirmed'
            };

            db.getOpDepositByL1Hash.mockResolvedValue(mockDeposit);

            request.get(`${BASE_URL}/0xabc`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockDeposit);
                    done();
                })
                .catch(done);
        });

        it('should handle deposit not found', (done) => {
            const error = new Error('Could not find deposit');
            db.getOpDepositByL1Hash.mockRejectedValue(error);

            request.get(`${BASE_URL}/0x999`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Could not find deposit' });
                    done();
                })
                .catch(done);
        });
    });
});
