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
app.use('/opBatches', require('../../api/opBatches'));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(400).json({ error: error.message });
});

const request = supertest(app);
const BASE_URL = '/opBatches';

describe('OpBatches API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        unmanagedError.mockImplementation((error, req, next) => {
            if (next && typeof next === 'function') {
                next(error);
            }
        });
    });

    describe(`GET ${BASE_URL}`, () => {
        it('should return paginated list of OP batches', (done) => {
            const mockData = {
                rows: [
                    { id: 1, batchIndex: 100, status: 'pending' },
                    { id: 2, batchIndex: 101, status: 'confirmed' }
                ],
                count: 50
            };

            db.getWorkspaceOpBatches.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .query({ page: 1, itemsPerPage: 10, order: 'DESC' })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: mockData.rows,
                        total: 50
                    });
                    expect(db.getWorkspaceOpBatches).toHaveBeenCalledWith(
                        1, 1, 10, 'DESC'
                    );
                    done();
                })
                .catch(done);
        });

        it('should handle errors when fetching batches', (done) => {
            const error = new Error('Database error');
            db.getWorkspaceOpBatches.mockRejectedValue(error);

            request.get(`${BASE_URL}`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Database error' });
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:batchIndex`, () => {
        it('should return batch details', (done) => {
            const mockBatch = {
                id: 1,
                batchIndex: 100,
                l1BlockNumber: 12345,
                status: 'confirmed'
            };

            db.getOpBatch.mockResolvedValue(mockBatch);

            request.get(`${BASE_URL}/100`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockBatch);
                    expect(db.getOpBatch).toHaveBeenCalledWith(1, '100');
                    done();
                })
                .catch(done);
        });

        it('should handle batch not found', (done) => {
            const error = new Error('Could not find batch');
            db.getOpBatch.mockRejectedValue(error);

            request.get(`${BASE_URL}/999`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Could not find batch' });
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:batchIndex/transactions`, () => {
        it('should return transactions for a batch', (done) => {
            const mockData = {
                total: 25,
                items: [{ id: 1, hash: '0x123' }]
            };

            db.getOpBatchTransactions.mockResolvedValue(mockData);

            request.get(`${BASE_URL}/100/transactions`)
                .query({ page: 1, itemsPerPage: 10, order: 'DESC' })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockData);
                    done();
                })
                .catch(done);
        });
    });
});
