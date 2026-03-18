jest.mock('@sentry/node');
const mockCustomerCreate = jest.fn().mockResolvedValue({ id: 'cus_test123' });
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate }
})));
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/lib/rpc');
require('../mocks/lib/crypto');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/firebase');

const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');
const { ProviderConnector } = require('../../lib/rpc');
const crypto = require('../../lib/crypto');
const flags = require('../../lib/flags');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/onboarding';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/setup`, () => {
    it('Should return 400 if email is missing', (done) => {
        request.post(`${BASE_URL}/setup`)
            .send({ password: 'pass123', path: 'private' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter.');
                done();
            });
    });

    it('Should return 400 if password is missing', (done) => {
        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', path: 'private' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter.');
                done();
            });
    });

    it('Should return 400 if path is missing', (done) => {
        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter.');
                done();
            });
    });

    it('Should return 400 if email is already in use', (done) => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce({ id: 1, email: 'test@test.com' });

        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123', path: 'private' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('This email is already in use.');
                done();
            });
    });

    it('Should return 400 if public path and rpcServer is missing', (done) => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123', path: 'public', explorerName: 'My Explorer' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter: rpcServer is required for public explorers.');
                done();
            });
    });

    it('Should return 400 if public path and explorerName is missing', (done) => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123', path: 'public', rpcServer: 'http://rpc.test' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter: explorerName is required for public explorers.');
                done();
            });
    });

    it('Should return 400 if public path and RPC is unreachable', (done) => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce(null);
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue(new Error('unreachable'))
        }));

        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123', path: 'public', rpcServer: 'http://rpc.test', explorerName: 'My Explorer' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Our servers can't query this RPC. Please use an RPC that is reachable from the internet.");
                done();
            });
    });

    it('Should return 200 for private path: creates user + workspace, enqueues processUser', (done) => {
        jest.spyOn(flags, 'isFirebaseAuthEnabled').mockReturnValueOnce(false);
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce(null);
        jest.spyOn(db, 'createUser').mockResolvedValueOnce({ id: 1, firebaseUserId: 'uid-123' });
        jest.spyOn(db, 'createWorkspace').mockResolvedValueOnce({ id: 10, name: 'My Workspace' });
        jest.spyOn(db, 'setCurrentWorkspace').mockResolvedValueOnce(true);
        jest.spyOn(crypto, 'firebaseHash').mockResolvedValueOnce({ passwordHash: 'hash', passwordSalt: 'salt' });

        request.post(`${BASE_URL}/setup`)
            .send({ email: 'test@test.com', password: 'pass123', path: 'private' })
            .expect(200)
            .then(({ body }) => {
                expect(db.createUser).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({ email: 'test@test.com' })
                );
                expect(db.createWorkspace).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({ name: expect.any(String) })
                );
                expect(db.setCurrentWorkspace).toHaveBeenCalled();
                expect(enqueue).toHaveBeenCalledWith(
                    'processUser',
                    expect.stringContaining('processUser-'),
                    expect.objectContaining({ id: 1 })
                );
                expect(body.token).toBeDefined();
                expect(body.user).toBeDefined();
                expect(body.workspace).toBeDefined();
                expect(body.explorer).toBeUndefined();
                done();
            });
    });

    it('Should return 200 for public path: creates user + workspace + explorer, enqueues processUser', (done) => {
        jest.spyOn(flags, 'isFirebaseAuthEnabled').mockReturnValueOnce(false);
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce(null);
        jest.spyOn(db, 'createUser').mockResolvedValueOnce({ id: 1, firebaseUserId: 'uid-123' });
        jest.spyOn(db, 'createWorkspace').mockResolvedValueOnce({ id: 10, name: 'My Workspace' });
        jest.spyOn(db, 'setCurrentWorkspace').mockResolvedValueOnce(true);
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 5, slug: 'free' });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 100, slug: 'my-explorer', name: 'My Explorer' });
        jest.spyOn(crypto, 'firebaseHash').mockResolvedValueOnce({ passwordHash: 'hash', passwordSalt: 'salt' });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(123)
        }));

        request.post(`${BASE_URL}/setup`)
            .send({
                email: 'test@test.com',
                password: 'pass123',
                path: 'public',
                rpcServer: 'http://rpc.test',
                explorerName: 'My Explorer',
                nativeToken: 'ETH'
            })
            .expect(200)
            .then(({ body }) => {
                expect(db.createUser).toHaveBeenCalled();
                expect(db.createWorkspace).toHaveBeenCalled();
                expect(db.createExplorerFromOptions).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({ name: 'My Explorer' })
                );
                expect(enqueue).toHaveBeenCalledWith(
                    'processUser',
                    expect.stringContaining('processUser-'),
                    expect.objectContaining({ id: 1 })
                );
                expect(body.token).toBeDefined();
                expect(body.user).toBeDefined();
                expect(body.workspace).toBeDefined();
                expect(body.explorer).toBeDefined();
                done();
            });
    });
});
