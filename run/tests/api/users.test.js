require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/crypto');
require('../mocks/lib/stripe');
require('../mocks/lib/tasks');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/users'

describe(`GET ${BASE_URL}/me/apiToken`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the api token', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ apiToken: 'apiToken' });
        request.get(`${BASE_URL}/me/apiToken`)
            .expect(200)
            .then(({ body: { apiToken }}) => {
                expect(apiToken).toEqual('apiToken');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/me/setCurrentWorkspace`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the current user', (done) => {
        request.post(`${BASE_URL}/me/setCurrentWorkspace`)
            .send({ data: { workspace: 'hardhat' }})
            .expect(200)
            .then(() => {
                expect(db.setCurrentWorkspace).toHaveBeenCalledWith('123', 'hardhat');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/me`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the current user', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        request.get(`${BASE_URL}/me`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1 });
                done();
            });
    });
});

describe(`POST ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {

        request.post(BASE_URL)
            .send({ data: { firebaseUserId: '123' }})
            .expect(200)
            .then(() => {
                expect(db.createUser).toHaveBeenCalledWith('123', {
                    email: 'antoine@tryethernal.com',
                    apiKey: '1234',
                    stripeCustomerId: '1234',
                    plan: 'free'
                });
                done();
            });
    });
});
