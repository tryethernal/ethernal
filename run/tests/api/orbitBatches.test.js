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

// Create a test app with just the orbitBatches router
const app = express();
app.use(express.json());
app.use('/orbitBatches', require('../../api/orbitBatches'));

// Add error handling middleware for tests
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(400).json({ error: error.message });
});

const request = supertest(app);

const BASE_URL = '/orbitBatches';

describe('OrbitBatches API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock unmanagedError to call next(error) to trigger error handling middleware
        unmanagedError.mockImplementation((error, req, next) => {
            if (next && typeof next === 'function') {
                next(error);
            }
        });
    });

    describe(`GET ${BASE_URL}/:batchNumber/transactions`, () => {
        it('should return paginated transactions for a batch', (done) => {
            const mockData = {
                total: 100,
                items: [
                    { id: 1, hash: '0x123', from: '0xabc', to: '0xdef' },
                    { id: 2, hash: '0x456', from: '0xghi', to: '0xjkl' }
                ]
            };

            db.getWorkspaceOrbitBatchTransactions.mockResolvedValue(mockData);

            request.get(`${BASE_URL}/123/transactions`)
                .query({
                    page: 1,
                    itemsPerPage: 10,
                    order: 'desc',
                    orderBy: 'time'
                })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockData);
                    expect(db.getWorkspaceOrbitBatchTransactions).toHaveBeenCalledWith(
                        1,
                        '123',
                        '1',
                        '10',
                        'desc',
                        'time'
                    );
                    done();
                })
                .catch(done);
        });

        it('should handle errors when fetching transactions', (done) => {
            const error = new Error('Database connection failed');
            db.getWorkspaceOrbitBatchTransactions.mockRejectedValue(error);

            request.get(`${BASE_URL}/123/transactions`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Database connection failed' });
                    expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:batchNumber/blocks`, () => {
        it('should return paginated blocks for a batch', (done) => {
            const mockData = {
                rows: [
                    { id: 1, number: 1000, hash: '0xabc' },
                    { id: 2, number: 1001, hash: '0xdef' }
                ],
                count: 50
            };

            db.getOrbitBatchBlocks.mockResolvedValue(mockData);

            request.get(`${BASE_URL}/123/blocks`)
                .query({
                    page: 1,
                    itemsPerPage: 10,
                    order: 'asc'
                })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        total: 50,
                        items: mockData.rows
                    });
                    expect(db.getOrbitBatchBlocks).toHaveBeenCalledWith(
                        1,
                        '123',
                        '1',
                        '10',
                        'asc'
                    );
                    done();
                })
                .catch(done);
        });

        it('should handle errors when fetching blocks', (done) => {
            const error = new Error('Invalid batch number');
            db.getOrbitBatchBlocks.mockRejectedValue(error);

            request.get(`${BASE_URL}/123/blocks`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Invalid batch number' });
                    expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:batchNumber`, () => {
        it('should return detailed batch information', (done) => {
            const mockBatch = {
                id: 123,
                number: 123,
                timestamp: '2024-01-01T00:00:00Z',
                transactionCount: 100,
                blockCount: 10,
                status: 'completed'
            };

            db.getOrbitBatch.mockResolvedValue(mockBatch);

            request.get(`${BASE_URL}/123`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockBatch);
                    expect(db.getOrbitBatch).toHaveBeenCalledWith(1, '123');
                    done();
                })
                .catch(done);
        });

        it('should handle errors when fetching batch details', (done) => {
            const error = new Error('Batch not found');
            db.getOrbitBatch.mockRejectedValue(error);

            request.get(`${BASE_URL}/999`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Batch not found' });
                    expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}`, () => {
        it('should return paginated list of batches', (done) => {
            const mockData = {
                rows: [
                    { id: 1, number: 120, status: 'completed' },
                    { id: 2, number: 121, status: 'processing' },
                    { id: 3, number: 122, status: 'pending' }
                ],
                count: 150
            };

            db.getWorkspaceOrbitBatches.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .query({
                    page: 1,
                    itemsPerPage: 10,
                    order: 'desc'
                })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: mockData.rows,
                        total: 150
                    });
                    expect(db.getWorkspaceOrbitBatches).toHaveBeenCalledWith(
                        1,
                        '1',
                        '10',
                        'desc'
                    );
                    done();
                })
                .catch(done);
        });

        it('should handle errors when fetching batches list', (done) => {
            const error = new Error('Workspace access denied');
            db.getWorkspaceOrbitBatches.mockRejectedValue(error);

            request.get(`${BASE_URL}`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Workspace access denied' });
                    // unmanagedError is called with (error, req, next) for the last route
                    expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                    done();
                })
                .catch(done);
        });

        it('should handle missing query parameters gracefully', (done) => {
            const mockData = {
                rows: [],
                count: 0
            };

            db.getWorkspaceOrbitBatches.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: [],
                        total: 0
                    });
                    expect(db.getWorkspaceOrbitBatches).toHaveBeenCalledWith(
                        1,
                        undefined,
                        undefined,
                        undefined
                    );
                    done();
                })
                .catch(done);
        });
    });
});
