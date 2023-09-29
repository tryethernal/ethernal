const mockPm2Start = jest.fn();
const mockPm2Find = jest.fn();
const mockPm2Restart = jest.fn();

jest.mock('../../lib/pm2', () => {
    return jest.fn().mockImplementation(() => ({
        start: mockPm2Start,
        find: mockPm2Find,
        restart: mockPm2Restart
    }))
});
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

describe(`DELETE ${BASE_URL}/:id`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should delete workspace', (done) => {
        jest.spyOn(db, 'deleteWorkspace').mockResolvedValueOnce();

        request.delete(`${BASE_URL}/1`)
            .expect(200)
            .then(() => done());
    });
});

describe(`GET ${BASE_URL}/:id`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return workspace', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce([{ name: 'local' }]);

        request.get(`${BASE_URL}/1`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ name: 'local' }]);
                done();
            });
    });
});

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
});

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

    it('Should not restart pm2 if sync is disabled', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ public: true, rpcServer: 'myrpc', explorer: { slug: 'slug', shouldSync: false }});

        request.post(`${BASE_URL}/settings`)
            .send({ data: { workspace: 'My Workspace', settings: { rpcServer: 'otherrpc' }}})
            .expect(200)
            .then(() => {
                expect(mockPm2Find).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should restart pm2 if workspace is public & rpc is reachable', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ public: true, rpcServer: 'myrpc', explorer: { slug: 'slug', shouldSync: true }});
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(1)
        }));
        mockPm2Find.mockResolvedValue({ data: { id: 1 }});

        request.post(`${BASE_URL}/settings`)
            .send({ data: { workspace: 'My Workspace', settings: { rpcServer: 'otherrpc' }}})
            .expect(200)
            .then(() => {
                expect(mockPm2Restart).toHaveBeenCalledWith('slug');
                done();
            });
    });

    it('Should start pm2 if workspace is public & rpc is reachable & process not found', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ id: 1, public: true, rpcServer: 'myrpc', explorer: { slug: 'slug', shouldSync: true }});
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(1)
        }));
        mockPm2Find.mockResolvedValue({ data: null });

        request.post(`${BASE_URL}/settings`)
            .send({ data: { workspace: 'My Workspace', settings: { rpcServer: 'otherrpc' }}})
            .expect(200)
            .then(() => {
                expect(mockPm2Start).toHaveBeenCalledWith('slug', 1);
                done();
            });
    });

    it('Should fail if workspace is public & rpc is not reachable', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ id: 1, public: true, rpcServer: 'myrpc', explorer: { slug: 'slug', shouldSync: true }});
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue()
        }));

        request.post(`${BASE_URL}/settings`)
            .send({ data: { workspace: 'My Workspace', settings: { rpcServer: 'otherrpc' }}})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
                done();
            });
    });

    it('Should return 200 status code', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ id: 1, public: false, rpcServer: 'myrpc' });
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
            fetchNetworkId: jest.fn().mockRejectedValue()
        }));
        mockPm2Find.mockResolvedValue({ data: { id: 1 }});

        request.post(`${BASE_URL}`)
            .send({ data: { name: 'My Workspace', workspaceData: { public: true, rpcServer: 'http://localhost:8545' }}})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
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

