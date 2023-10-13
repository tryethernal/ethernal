jest.mock('random-word-slugs', () => ({
    generateSlug: jest.fn()
}));
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/crypto');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/demo';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/explorers`, () => {
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
        jest.spyOn(db, 'createExplorerWithWorkspace').mockResolvedValueOnce(null);

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
        jest.spyOn(db, 'createExplorerWithWorkspace').mockResolvedValueOnce({ id: 1, slug: 'slug' });
        jest.spyOn(db, 'makeExplorerDemo').mockResolvedValueOnce();
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
        jest.spyOn(db, 'createExplorerWithWorkspace').mockResolvedValueOnce({ id: 1, slug: 'slug' });
        jest.spyOn(db, 'makeExplorerDemo').mockResolvedValueOnce();
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerSubscription').mockResolvedValueOnce();
        jest.spyOn(db, 'updateExplorerSettings').mockResolvedValueOnce();
        jest.spyOn(db, 'updateExplorerBranding').mockResolvedValueOnce();

        request.post(`${BASE_URL}/explorers`)
            .send({ name: 'demo', rpcServer: 'rpc.demo', nativeToken: 'token' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ domain: 'slug.ethernal.com' });
                done()
            });
    });
});
