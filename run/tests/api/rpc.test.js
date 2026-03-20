jest.mock('@sentry/node');
require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/lib/rpc');
require('../mocks/lib/crypto');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/firebase');

const { ProviderConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/rpc';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/validate`, () => {
    it('Should return 400 if rpcServer is missing', (done) => {
        request.post(`${BASE_URL}/validate`)
            .send({})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameter.');
                done();
            });
    });

    it('Should return 400 if rpcServer is not a valid URL', (done) => {
        request.post(`${BASE_URL}/validate`)
            .send({ rpcServer: 'not-a-url' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid RPC URL.');
                done();
            });
    });

    it('Should return 400 if RPC is unreachable', (done) => {
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue(new Error('timeout'))
        }));

        request.post(`${BASE_URL}/validate`)
            .send({ rpcServer: 'https://unreachable.example.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Our servers can't query this RPC. Please use an RPC that is reachable from the internet.");
                done();
            });
    });

    it('Should return 400 if networkId is null', (done) => {
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(null)
        }));

        request.post(`${BASE_URL}/validate`)
            .send({ rpcServer: 'https://rpc.example.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Our servers can't query this RPC. Please use an RPC that is reachable from the internet.");
                done();
            });
    });

    it('Should return chainId and networkId on success', (done) => {
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(84532)
        }));

        request.post(`${BASE_URL}/validate`)
            .send({ rpcServer: 'https://rpc.example.com' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ chainId: 84532, networkId: 84532 });
                done();
            });
    });
});
