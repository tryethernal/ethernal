require('../mocks/lib/queue');
require('../mocks/lib/stripe');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/stripeLib');
require('../mocks/lib/firebase');

const stripeLib = require('../../lib/stripe');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/webhooks/stripe';

describe(`POST ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return a 200 status and call the payment succeded handler', (done) => {
        request.post(BASE_URL)
            .set('stripe-signature', '123')
            .expect(200)
            .then(() => {
                expect(stripeLib.handleStripePaymentSucceeded).toHaveBeenCalledWith({});
                done();
            });
    });
});

