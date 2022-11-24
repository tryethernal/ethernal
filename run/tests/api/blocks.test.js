require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/blocks'

describe(`POST ${BASE_URL}/syncRange`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should enqueue a batchBlockSync task', (done) => {
        request.post(`${BASE_URL}/syncRange`)
            .send({ data: { workspace: 'My Workspace', from: 1, to: 10 }})
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('batchBlockSync', expect.anything(), {
                    userId: '123',
                    workspace: 'My Workspace',
                    from: 1,
                    to: 10,
                });
                done();
            });
    });
});

describe(`POST ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should throw an error if block number is missing with server sync', (done) => {
        request.post(`${BASE_URL}/?serverSync=true`)
            .send({ data: { workspace: 'My Workspace', block: {}}})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('[POST /api/blocks] Missing block number.');
                done();
            });
    });


    it('Should enqueue server side block sync', (done) => {
        request.post(`${BASE_URL}/?serverSync=true`)
            .send({ data: { workspace: 'My Workspace', block: { number: 123 }}})
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('blockSync', expect.anything(), {
                    userId: '123',
                    workspace: 'My Workspace',
                    blockNumber: 123
                }, expect.anything());
                done();
            });
    });

    it('Should return 200 status code', (done) => {
        request.post(BASE_URL)
            .send({ data: { workspace: 'My Workspace', block: { number: 123 }}})
            .expect(200)
            .then(() => {
                expect(db.storeBlock).toHaveBeenCalledWith('123', 'My Workspace', { number: 123 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:number`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getWorkspaceBlock.mockResolvedValue({ number: 1234 });
        request.get(`${BASE_URL}/1234`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    number: 1234
                });
                expect(db.getWorkspaceBlock).toHaveBeenCalledWith(1, '1234', false);
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        db.getWorkspaceBlocks.mockResolvedValue([{ number: 1234 }]);
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([
                    { number: 1234 }
                ]);
                expect(db.getWorkspaceBlocks).toHaveBeenCalledWith(1, undefined, undefined, undefined);
                done();
            });
    });
});
