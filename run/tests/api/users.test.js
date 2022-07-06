require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/users'

describe(`POST ${BASE_URL}/me/setCurrentWorkspace`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return the current user', (done) => {
        request.post(`${BASE_URL}/me/setCurrentWorkspace`)
            .send({ data: { workspace: 'hardhat' }})
            .expect(200)
            .then(() => {
                expect(db.setCurrentWorkspace).toHaveBeenCalledWith('123', 'hardhat');
                done();
            })
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
            })
    });
});

describe(`POST ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return 200 status code', (done) => {
        request.post(BASE_URL)
            .send({ data: { uid: '123', data: { email: 'antoine@tryethernal.com' }}})
            .expect(200)
            .then(() => {
                expect(db.createUser).toHaveBeenCalledWith('123', { email: 'antoine@tryethernal.com' });
                done();
            })
    });
});
