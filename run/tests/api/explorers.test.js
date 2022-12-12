require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/explorers';

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

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