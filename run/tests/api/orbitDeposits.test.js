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
    it('Should return rows & total count', (done) => {
        jest.spyOn(db, 'getWorkspaceOrbitDeposits').mockResolvedValue({ count: 2, rows: [{ id: 1 }, { id: 2 }] });
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [{ id: 1 }, { id: 2 }],
                    total: 2
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(1, undefined, undefined, undefined);
                done();
            });
    });

    it('Should pass query parameters to database function', (done) => {
        jest.spyOn(db, 'getWorkspaceOrbitDeposits').mockResolvedValue({ count: 1, rows: [{ id: 1 }] });
        request.get(BASE_URL)
            .query({ page: 2, itemsPerPage: 10, order: 'desc' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [{ id: 1 }],
                    total: 1
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(1, '2', '10', 'desc');
                done();
            });
    });

    it('Should handle empty results', (done) => {
        jest.spyOn(db, 'getWorkspaceOrbitDeposits').mockResolvedValue({ count: 0, rows: [] });
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [],
                    total: 0
                });
                done();
            });
    });

    it('Should handle database errors', (done) => {
        const error = new Error('Database connection failed');
        jest.spyOn(db, 'getWorkspaceOrbitDeposits').mockRejectedValue(error);
        request.get(BASE_URL)
            .expect(500)
            .then(() => {
                expect(unmanagedError).toHaveBeenCalledWith(error, expect.any(Object), expect.any(Function));
                done();
            });
    });

    it('Should handle invalid query parameters', (done) => {
        jest.spyOn(db, 'getWorkspaceOrbitDeposits').mockResolvedValue({ count: 1, rows: [{ id: 1 }] });
        request.get(BASE_URL)
            .query({ page: 'invalid', itemsPerPage: 'not-a-number', order: 'invalid' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    items: [{ id: 1 }],
                    total: 1
                });
                expect(db.getWorkspaceOrbitDeposits).toHaveBeenCalledWith(1, 'invalid', 'not-a-number', 'invalid');
                done();
            });
    });
});
