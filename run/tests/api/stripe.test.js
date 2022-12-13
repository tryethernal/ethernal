require('../mocks/lib/queue');
require('../mocks/middlewares/auth');
require('../mocks/lib/firebase');
require('../mocks/lib/stripe');

const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/stripe';

describe(`GET ${BASE_URL}/createCheckoutSession`, () => {
    beforeEach(() => jest.clearAllMocks());

     it('Should return a 200 with a session url', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        request.post(`${BASE_URL}/createCheckoutSession`)
            .send({ data: { uid: 1, plan: 'premium' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ url : 'https://stripe.com' });
                done();
            });
    });

     it('Should return an error if plan is invalid', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        request.post(`${BASE_URL}/createCheckoutSession`)
            .send({ data: { uid: 1, plan: 'invalid' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid plan.');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/createPortalSession`, () => {
    beforeEach(() => jest.clearAllMocks());

     it('Should return a 200 with a session url', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        request.post(`${BASE_URL}/createPortalSession`)
            .send({ data: { uid: 1 }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ url : 'https://stripe.com' });
                done();
            });
    });
});
