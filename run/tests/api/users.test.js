require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/crypto');
require('../mocks/lib/stripe');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/passportLocalStrategy');
const db = require('../../lib/firebase');
const { decode } = require('../../lib/crypto');
const flags = require('../../lib/flags');
const { enqueue } = require('../../lib/queue');
const { getAuth } = require('firebase-admin/auth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/users'

describe(`POST ${BASE_URL}/resetPassword`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return an error if the token is missing fields', (done) => {
        decode.mockReturnValueOnce({ expiresAt: 1234 });
        request.post(`${BASE_URL}/resetPassword`)
            .send({ token: 'token', password: '123' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid link, please send another password reset request.');
                done();
            });
    });

    it('Should return an error if the token is expired', (done) => {
        decode.mockReturnValueOnce({ expiresAt: 1234, email: '1234' });
        request.post(`${BASE_URL}/resetPassword`)
            .send({ token: 'token', password: '123' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('This password reset link has expired.');
                done();
            });
    });

    it('Should update user fields if firebase auth is enabled', (done) => {
        decode.mockReturnValueOnce({ expiresAt: 12349999999999999999, email: 'antoine@tryethernal.com' });
        jest.spyOn(db, 'getUserByEmail').mockResolvedValueOnce({ firebaseUserId: '1234' })
        request.post(`${BASE_URL}/resetPassword`)
            .send({ token: 'token', password: '123' })
            .expect(200)
            .then(() => {
                expect(db.updateUserFirebaseHash).toHaveBeenCalledWith('antoine@tryethernal.com', 'salt', 'hash');
                done();
            });
    });

    it('Should set user password if firebase auth is disabled', (done) => {
        decode.mockReturnValueOnce({ expiresAt: 12349999999999999999, email: 'antoine@tryethernal.com' });
        jest.spyOn(flags, 'isFirebaseAuthEnabled').mockReturnValueOnce(false);

        request.post(`${BASE_URL}/resetPassword`)
            .send({ token: 'token', password: '123' })
            .expect(200)
            .then(() => {
                expect(db.setUserPassword).toHaveBeenCalledWith('antoine@tryethernal.com', '123');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/sendResetPasswordEmail`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should enqueue reset password email task', (done) => {
        request.post(`${BASE_URL}/sendResetPasswordEmail`)
            .send({ email: 'antoine@tryethernal.com' })
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('sendResetPasswordEmail', expect.anything(), { email: 'antoine@tryethernal.com' });
                done();
            });
    });

    it('Should fail if sendgrid is not enabled', (done) => {
        jest.spyOn(flags, 'isSendgridEnabled').mockReturnValueOnce(false);
        request.post(`${BASE_URL}/sendResetPasswordEmail`)
            .send({ email: 'antoine@tryethernal.com' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Sendgrid has not been enabled.');
                done();
            });
    });
});

describe(`POST ${BASE_URL}/signin`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return user data', (done) => {
        request.post(`${BASE_URL}/signin`)
            .send({ email: 'antoine@tryethernal.com', password: '123' })
            .expect(200)
            .then(({ body: { user }}) => {
                expect(user).toEqual({ id: 1 });
                done();
            });
    });
});

describe.only(`POST ${BASE_URL}/signup`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should create firebase user', (done) => {
        request.post(`${BASE_URL}/signin`)
            .send({ email: 'antoine@tryethernal.com', password: '123' })
            .expect(200)
            .then(({ body: { user }}) => {
                expect(user).toEqual({ id: 1 });
                done();
            });
    });

    it('')
});

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
