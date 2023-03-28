require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/secret');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/explorers';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}`, () => {
    it('Should return an error if the workspace does not exist', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }] });

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find workspace.');
                done();
            });
    });

    it('Should return the created explorer', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorer').mockResolvedValueOnce({ id: 1 });

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return the corresponding explorer when passed a domain', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsByDomain').mockResolvedValueOnce({ slug: 'ethernal', name: 'Ethernal Explorer' });
        request.get(`${BASE_URL}?domain=explorer.ethernal.com`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ slug: 'ethernal', name: 'Ethernal Explorer' });
                done();
            });
    });

    it('Should return the corresponding explorer when passed a slug', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({ slug: 'ethernal', name: 'Ethernal Explorer' });
        request.get(`${BASE_URL}?slug=ethernal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ slug: 'ethernal', name: 'Ethernal Explorer' });
                done();
            });
    });

     it('Should return an error if explorer does not exist', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}?slug=ethernal`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });
});