require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/accounts';

describe(`POST ${BASE_URL}/:address/syncBalance`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/123A/syncBalance`)
            .send({ data: { workspace: 'My Workspace', balance: '1234567' }})
            .expect(200)
            .then(() => {
                expect(db.updateAccountBalance).toHaveBeenCalledWith('123', 'My Workspace', '123a', '1234567');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:address/privateKey`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(`${BASE_URL}/123A/privateKey`)
            .send({ data: { workspace: 'My Workspace', privateKey: '1234567' }})
            .expect(200)
            .then(() => {
                expect(db.storeAccountPrivateKey).toHaveBeenCalledWith('123', 'My Workspace', '123a', '1234');
                done();
            });
    });
});
