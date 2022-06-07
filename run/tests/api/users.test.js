require('../mocks/models');
require('../mocks/lib/firebase');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/users'

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
