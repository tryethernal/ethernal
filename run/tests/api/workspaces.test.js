require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');

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

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}`)
            .send({ data: { name: 'My Workspace', workspaceData: { notvalid: 'ok', rpcServer: 'http://localhost:8545' }}})
            .expect(200)
            .then(() => {
                expect(db.createWorkspace).toHaveBeenCalledWith('123', {
                    name: 'My Workspace',
                    rpcServer: 'http://localhost:8545'
                });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/enableAlchemy`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getUser.mockResolvedValue({ apiKey: 'abcd' });
        request.post(`${BASE_URL}/enableAlchemy`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.addIntegration).toHaveBeenCalledWith('123', 'My Workspace', 'alchemy');
                expect(body).toEqual({ token: '1234' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/enableApi`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getUser.mockResolvedValue({ apiKey: 'abcd' });
        request.post(`${BASE_URL}/enableApi`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.addIntegration).toHaveBeenCalledWith('123', 'My Workspace', 'api');
                expect(body).toEqual({ token: '1234' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/disableAlchemy`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getUser.mockResolvedValue({ apiKey: 'abcd' });
        request.post(`${BASE_URL}/disableAlchemy`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.removeIntegration).toHaveBeenCalledWith('123', 'My Workspace', 'alchemy');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/disableApi`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getUser.mockResolvedValue({ apiKey: 'abcd' });
        request.post(`${BASE_URL}/disableApi`)
            .send({ data: { workspace: 'My Workspace' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.removeIntegration).toHaveBeenCalledWith('123', 'My Workspace', 'api');
                done();
            });
    });
});
