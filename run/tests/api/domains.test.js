jest.mock('axios');
require('../mocks/models');
require('../mocks/lib/utils');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');

const axios = require('axios');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/domains';

beforeEach(() => jest.clearAllMocks());

describe(`DELETE ${BASE_URL}/:id`, () => {
    it('Should delete & return 200', (done) => {
        jest.spyOn(db, 'deleteExplorerDomain').mockResolvedValueOnce();
        request.delete(`${BASE_URL}/123`)
            .expect(200)
            .then(() => done());
    });
});

describe(`GET ${BASE_URL}/:id`, () => {
    it('Should domain data', (done) => {
        jest.spyOn(db, 'getExplorerDomainById').mockResolvedValueOnce({ domain: 'ethernal.com' });
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { data : { apx_hit: true, is_resolving: true, last_monitored_humanized: 'ok', status: 'ok', status_message: 'ok', has_ssl: true }}});

        request.get(`${BASE_URL}/123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ apx_hit: true, is_resolving: true, last_monitored_humanized: 'ok', status: 'ok', status_message: 'ok', has_ssl: true });
                done();
            });
    });
});
