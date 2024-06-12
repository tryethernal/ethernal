require('../mocks/lib/logger');
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/middlewares/workspaceAuth');

const db = require('../../lib/firebase');
const workspaceAuthMiddleware = require('../../middlewares/workspaceAuth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/status';

describe(`GET /`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return statuses', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.authenticated = true;
            req.query.workspace = {
                integrityCheckStartBlockNumber: 0,
                integrityCheck: {
                    status: 'healthy',
                    block: { number: 1 },
                    updatedAt: new Date()
                },
                rpcHealthCheck: {
                    isReachable: true,
                    updatedAt: new Date()
                },
                authenticated: true
            };
            next();
        });

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    syncStatus: 'healthy',
                    latestCheckedBlock: 1,
                    latestCheckedAt: expect.anything(),
                    startingBlock: 0,
                    isRpcReachable: true,
                    rpcHealthCheckedAt: expect.anything()
                });
                done();
            });
    });

    it('Should return a 404 if statusPage not enabled and not authenticated', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.workspace = { statusPageEnabled: false, authenticated: false }
            next();
        });

        request.get(BASE_URL)
            .expect(404)
            .then(_ => done());
    });

    it('Should return a 400 if no status are enabled', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.workspace = { statusPageEnabled: true, rpcHealthCheckEnabled: false, integrityCheckStartBlockNumber: null, authenticated: true }
            next();
        });

        request.get(BASE_URL)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Status is not available on this workspace');
                done();
            });
    });

    it('Should return only integrity check', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.workspace = {
                statusPageEnabled: true,
                rpcHealthCheckEnabled: false,
                integrityCheckStartBlockNumber: 0,
                integrityCheck: {
                    status: 'healthy',
                    block: { number: 1 },
                    updatedAt: new Date()
                }
            };
            next();
        });

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    syncStatus: 'healthy',
                    latestCheckedBlock: 1,
                    latestCheckedAt: expect.anything(),
                    startingBlock: 0
                });
                done();
            });
    });

    it('Should return only healthcheck', (done) => {
        workspaceAuthMiddleware.mockImplementationOnce((req, res, next) => {
            req.query.workspace = {
                statusPageEnabled: true,
                rpcHealthCheckEnabled: true,
                integrityCheckStartBlockNumber: null,
                rpcHealthCheck: {
                    isReachable: true,
                    updatedAt: new Date()
                }
            };
            next();
        });

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    isRpcReachable: true,
                    rpcHealthCheckedAt: expect.anything()
                });
                done();
            });
    });
});
