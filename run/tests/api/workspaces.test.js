require('../mocks/lib/rpc');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/middlewares/auth');
require('../mocks/lib/queue');
const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/workspaces';

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return user workspaces', (done) => {
        jest.spyOn(db, 'getUserWorkspaces').mockResolvedValueOnce([{ name: 'local' }]);

        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ name: 'local' }]);
                done();
            });
    });
})

describe(`POST ${BASE_URL}/reset`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/reset`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.resetWorkspace).toHaveBeenCalledWith('123', 'My Workspace');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/setCurrent`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/setCurrent`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.setCurrentWorkspace).toHaveBeenCalledWith('123', 'My Workspace');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/settings`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/settings`)
            .send({ data: { workspace: 'My Workspace', settings: { rpcServer: 'http://localhost:8545' }}})
            .expect(200)
            .then(() => {
                expect(db.updateWorkspaceSettings).toHaveBeenCalledWith('123', 'My Workspace', { rpcServer: 'http://localhost:8545' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should fail if workspace is public & rpc not reachable', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ defaultDataRetentionLimit: 7 });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(null)
        }));

        request.post(`${BASE_URL}`)
            .send({ data: { name: 'My Workspace', workspaceData: { public: true, rpcServer: 'http://localhost:8545' }}})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't reach RPC server, make sure it's accessible.`);
                done();
            });
    });

    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ defaultDataRetentionLimit: 7 });
        jest.spyOn(db, 'createWorkspace').mockResolvedValueOnce({ name: 'My Workspace' });
        request.post(`${BASE_URL}`)
            .send({ data: { name: 'My Workspace', workspaceData: { notvalid: 'ok', rpcServer: 'http://localhost:8545' }}})
            .expect(200)
            .then(() => {
                expect(db.setCurrentWorkspace).toHaveBeenCalled();
                expect(db.createWorkspace).toHaveBeenCalledWith('123', {
                    name: 'My Workspace',
                    rpcServer: 'http://localhost:8545',
                    dataRetentionLimit: 7
                });
                done();
            });
    });
});

