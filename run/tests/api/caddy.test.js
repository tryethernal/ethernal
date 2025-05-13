require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/middlewares/selfHosted');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/lib/env');

const db = require('../../lib/firebase');
const flags = require('../../lib/flags');
const env = require('../../lib/env');

jest.spyOn(flags, 'isSelfHosted')
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(true);

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/caddy';

describe(`GET ${BASE_URL}/validDomain`, () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should return a 400 if domain is not allowed', (done) => {
        jest.spyOn(db, 'isValidExplorerDomain').mockResolvedValueOnce(false);
        request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'example.com' })
            .expect(400)
            .then(() => done());
    });

    it('Should return a 200 for subdomains', (done) => {
        jest.spyOn(env, 'getAppDomain').mockReturnValueOnce('example.com');
        request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'subdomain.example.com' })
            .expect(200)
            .then(() => done());
    });

    it('Should return a 200 for valid main domain', (done) => {
        jest.spyOn(db, 'isValidExplorerDomain').mockResolvedValueOnce(true);
        request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'example.com' })
            .expect(200)
            .then(() => done());
    });
});
