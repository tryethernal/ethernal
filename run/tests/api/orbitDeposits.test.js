require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/env');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/browserSync');
require('../mocks/lib/errors');

const db = require('../../lib/firebase');
const { unmanagedError } = require('../../lib/errors');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/orbitDeposits';

beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock unmanagedError to call next(error) to trigger error handling middleware
    unmanagedError.mockImplementation((error, req, next) => {
        if (next && typeof next === 'function') {
            next(error);
        }
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('should return paginated orbit deposits with default parameters', (done) => {
        const mockData = {
            rows: [
                { id: 1, hash: '0x123', from: '0xabc', to: '0xdef', amount: '1000000000000000000' },
                { id: 2, hash: '0x456', from: '0xghi', to: '0xjkl', amount: '2000000000000000000' }
            ],
            count: 50
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockData.rows,
                    total: 50
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1, // workspace.id from mock
                    undefined, // page
                    undefined, // itemsPerPage
                    undefined  // order
                );
                done();
            })
            .catch(done);
    });

    it('should return paginated orbit deposits with query parameters', (done) => {
        const mockData = {
            rows: [
                { id: 3, hash: '0x789', from: '0xmno', to: '0xpqr', amount: '3000000000000000000' }
            ],
            count: 25
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .query({
                page: 2,
                itemsPerPage: 10,
                order: 'asc'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockData.rows,
                    total: 25
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1, // workspace.id from mock
                    '2', // page
                    '10', // itemsPerPage
                    'asc' // order
                );
                done();
            })
            .catch(done);
    });

    it('should handle empty results', (done) => {
        const mockData = {
            rows: [],
            count: 0
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .query({
                page: 1,
                itemsPerPage: 20,
                order: 'desc'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1,
                    '1',
                    '20',
                    'desc'
                );
                done();
            })
            .catch(done);
    });

    it('should handle database errors', (done) => {
        const error = new Error('Database connection failed');
        db.getWorkspaceOrbitDeposits.mockRejectedValue(error);

        request.get(BASE_URL)
            .expect(400)
            .then(({ body }) => {
                expect(body).toEqual({ error: 'Database connection failed' });
                expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                done();
            })
            .catch(done);
    });

    it('should handle invalid query parameters gracefully', (done) => {
        const mockData = {
            rows: [
                { id: 1, hash: '0x123', from: '0xabc', to: '0xdef', amount: '1000000000000000000' }
            ],
            count: 1
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .query({
                page: 'invalid',
                itemsPerPage: 'not-a-number',
                order: 'invalid-order',
                extraParam: 'should-be-ignored'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockData.rows,
                    total: 1
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1,
                    'invalid', // passed as-is since no validation
                    'not-a-number',
                    'invalid-order'
                );
                done();
            })
            .catch(done);
    });

    it('should handle large page numbers', (done) => {
        const mockData = {
            rows: [],
            count: 0
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .query({
                page: 999999,
                itemsPerPage: 100
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1,
                    '999999',
                    '100',
                    undefined
                );
                done();
            })
            .catch(done);
    });

    it('should handle special characters in order parameter', (done) => {
        const mockData = {
            rows: [
                { id: 1, hash: '0x123', from: '0xabc', to: '0xdef', amount: '1000000000000000000' }
            ],
            count: 1
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        request.get(BASE_URL)
            .query({
                order: 'desc; DROP TABLE deposits; --'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockData.rows,
                    total: 1
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1,
                    undefined,
                    undefined,
                    'desc; DROP TABLE deposits; --'
                );
                done();
            })
            .catch(done);
    });

    it('should handle workspace authentication middleware', (done) => {
        const mockData = {
            rows: [
                { id: 1, hash: '0x123', from: '0xabc', to: '0xdef', amount: '1000000000000000000' }
            ],
            count: 1
        };

        db.getWorkspaceOrbitDeposits.mockResolvedValue(mockData);

        // The workspaceAuth middleware should be applied and workspace.id should be available
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: mockData.rows,
                    total: 1
                });
                // Verify that the workspace ID from the middleware is used
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(
                    1, // This comes from the workspaceAuth middleware mock
                    expect.any(String),
                    expect.any(String),
                    expect.any(String)
                );
                done();
            })
            .catch(done);
    });

    it('should handle concurrent requests', (done) => {
        const mockData1 = {
            rows: [{ id: 1, hash: '0x123' }],
            count: 1
        };
        const mockData2 = {
            rows: [{ id: 2, hash: '0x456' }],
            count: 1
        };

        db.getWorkspaceOrbitDeposits
            .mockResolvedValueOnce(mockData1)
            .mockResolvedValueOnce(mockData2);

        const request1 = request.get(BASE_URL).query({ page: 1 });
        const request2 = request.get(BASE_URL).query({ page: 2 });

        Promise.all([
            request1.expect(200),
            request2.expect(200)
        ]).then(([res1, res2]) => {
            expect(res1.body).toEqual({ items: mockData1.rows, total: 1 });
            expect(res2.body).toEqual({ items: mockData2.rows, total: 1 });
            expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledTimes(2);
            done();
        }).catch(done);
    });
});
