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
const mockCountUp = jest.fn();
const mockGetCount = jest.fn();
jest.mock('../../lib/counter', () => ({
    countUp: mockCountUp,
    getCount: mockGetCount
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
const { enqueue } = require('../../lib/queue');
const { ProviderConnector, DexConnector } = require('../../lib/rpc');
const crypto = require('../../lib/crypto');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/demo';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/explorers/:id/v2_dexes`, () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should throw an error if no demo user', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find demo account.');
                done();
            });
    });

    it('Should throw an error if the explorer is not a demo', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            isDemo: false
        });

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should throw an error if cannot get factory address', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' },
            isDemo: true
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockRejectedValueOnce('Error')
        }));

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't get factory address for router. Check that the factory method is present and returns an address.`);
                done();
            });
    });

    it('Should throw an error if invalid factory address', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' },
            isDemo: true
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockResolvedValueOnce('0x123')
        }));

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Invalid factory address.`);
                done();
            });
    });

    it('Should fail if missing parameters', (done) => {
        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: {} })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameters');
                done();
            });
    });

    it('Should return the created dex', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' },
            isDemo: true
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockResolvedValueOnce('0x4150e51980114468aa8309bb72f027d8bff41353')
        }));
        jest.spyOn(db, 'createExplorerV2Dex').mockResolvedValueOnce({ id: 1, routerAddress: '0x123', factoryAddress: '0x456' });

        request.post(`${BASE_URL}/explorers/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ v2Dex: { id: 1, routerAddress: '0x123', factoryAddress: '0x456' } });
                done();
            });
    });
});

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

    it('Should return an error if trying to create an explorer for a forbidden network id', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(1)
        }));

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
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
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
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
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(1)
        }));

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not create explorer. Please retry.');
                done();
            });
    });

    it('Should return an error if the plan is invalid', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(1)
        }));

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Error setting up the explorer. Please retry.');
                done();
            });
    });

    it('Should return an error if too many demo explorers are created with the same network id', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1, slug: 'slug' });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(54321)
        }));
        mockCountUp.mockResolvedValueOnce(4);

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`You've reached the limit of demo explorers for this chain (networkId: 54321). Please subscribe to a plan or reach out to contact@tryethernal.com for an extended trial.`);
                done();
            });
    });

    it('Should not use the counter if the network is whitelisted', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1, slug: 'slug' });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(31337)
        }));

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
            .expect(200)
            .then(() => {
                expect(mockCountUp).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should create the demo explorer', (done) => {
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ id: 123 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1, slug: 'slug' });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValueOnce(1)
        }));
        mockGetCount.mockResolvedValueOnce(0);

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token', email: 'email@email.com' })
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('sendDiscordMessage', 'sendDiscordMessage-1', { content: expect.any(String), channel: expect.any(String) });
                expect(enqueue).toHaveBeenCalledWith('sendDemoExplorerLink', 'sendDemoExplorerLink-1', { email: 'email@email.com', explorerSlug: 'slug' });
                done();
            });
    });
});
