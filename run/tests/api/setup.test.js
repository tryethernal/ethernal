require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/middlewares/selfHosted');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');

const db = require('../../lib/firebase');
const flags = require('../../lib/flags');

jest.spyOn(flags, 'isSelfHosted')
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(true);

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/setup';

describe(`POST ${BASE_URL}/admin`, () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should return a 400 if setup is not allowed', (done) => {
        jest.spyOn(db, 'canSetupAdmin').mockResolvedValueOnce(false);
        request.post(`${BASE_URL}/admin`)
            .send({ username: 'admin', password: 'password' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Setup is not allowed');
                done();
            });
    });
    it('Should return a 200 with the user object', (done) => {
        jest.spyOn(db, 'canSetupAdmin').mockResolvedValueOnce(true);
        jest.spyOn(db, 'createAdmin').mockResolvedValueOnce({ email: 'admin@example.com' });
        request.post(`${BASE_URL}/admin`)
            .send({ email: 'admin@example.com', password: 'password' })
            .expect(200)
            .then(({ text }) => {
                expect(text).toEqual(JSON.stringify({ user: { email: 'admin@example.com' } }));
                done();
            });
    });
});
