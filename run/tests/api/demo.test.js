jest.mock('@sentry/node');
const mockSubscriptionCreate = jest.fn().mockResolvedValue({ id: 'id' });
jest.mock('random-word-slugs', () => ({
    generateSlug: jest.fn()
}));
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            subscriptions: {
                create: mockSubscriptionCreate
            }
        }
    });
});
const mockAxiosGet = jest.fn().mockResolvedValue({ data: 'export default {}' });
jest.mock('axios', () => ({
    get: mockAxiosGet
}));
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/lib/rpc');
require('../mocks/lib/crypto');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const crypto = require('../../lib/crypto');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/demo';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/explorers`, () => {
    it('Should fail if no user', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce(null);

        request.get(`${BASE_URL}/explorers?token=token`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find user.');
                done();
            });
    });

    it('Should return an error if invalid token', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce(null);

        request.get(`${BASE_URL}/explorers?token=token`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid token.');
                done();
            });
    });

    it('Should return if cannot find explorer', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.get(`${BASE_URL}/explorers?token=token`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should return an error if not a demo anymore', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: false });

        request.get(`${BASE_URL}/explorers?token=token`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('This token has already been used. Please create another demo explorer and try again.');
                done();
            });
    })

    it('Should return explorer info', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true, name: 'explorer', rpcServer: 'rpc.demo' });

        request.get(`${BASE_URL}/explorers?token=token`)
            .send({ data: { token: 'token' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1, name: 'explorer', rpcServer: 'rpc.demo' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/migrateExplorer`, () => {
    it('Should fail if trial has already been used', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`You've already used your trial.`);
                done();
            });
    });

    it('Should fail if token is invalid', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce(null);

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid token.');
                done();
            });
    });

    it('Should fail if cannot find explorer', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should fail if explorer is not a demo anymore', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: false });

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('This token has already been used. Please create another demo explorer and try again.');
                done();
            });
    });

    it('Should fail if no user', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find user.');
                done();
            });
    });

    it('Should fail if cannot find plan', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, canTrial: true });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find plan.');
                done();
            });
    });

    it('Should return the migrated explorer id', (done) => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({ explorerId: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, isDemo: true, workspace: { name: 'explorer' }});
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, canTrial: true });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ stripePriceId: 'id' });
        jest.spyOn(db, 'migrateDemoExplorer').mockResolvedValueOnce();

        request.post(`${BASE_URL}/migrateExplorer`)
            .send({ data: { token: 'token' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ explorerId: 1 });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/explorers`, () => {
    mockAxiosGet.mockResolvedValueOnce({ data: 'export default { "1": "ethereum" }' });
    ProviderConnector.mockImplementationOnce(() => ({
        fetchNetworkId: jest.fn().mockResolvedValueOnce(1)
    }));

    it('Should return an error if trying to create an explorer for a forbidden network id', (done) => {
        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`You can't create a demo with this network id (1 - ethereum). If you'd still like an explorer for this chain. Please reach out to contact@tryethernal.com, and we'll set one up for you.`);
                done();
            });
    });

    it('Should return an error if rpc is not reachable', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue()
        }));

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
                done();
            });
    });

    it('Should return an error if creation fails', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not create explorer. Please retry.');
                done();
            });
    });

    it('Should return an error if the plan is invalid', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Error setting up the explorer. Please retry.');
                done();
            });
    });

    it('Should create the demo explorer', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1, slug: 'slug' });

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ domain: 'slug.ethernal.com' });
                done();
            });
    });
});
