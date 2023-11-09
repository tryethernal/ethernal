const mockSessionCreate = jest.fn().mockResolvedValue({ url: 'https://stripe.com' });
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            billingPortal: {
                sessions: {
                    create: jest.fn().mockResolvedValue({ url: 'https://stripe.com' })
                }
            },
            checkout: {
                sessions: {
                    create: mockSessionCreate
                }
            }
        }
    });
});
require('../mocks/lib/queue');
require('../mocks/lib/analytics');
require('../mocks/middlewares/auth');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');

const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/stripe';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/createUserCheckoutSession`, () => {
     it('Should return a 200 with a session url', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });

        request.post(`${BASE_URL}/createUserCheckoutSession`)
            .expect(200) 
            .then(({ body }) => {
                expect(body).toEqual({ url : 'https://stripe.com' });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/createExplorerCheckoutSession`, () => {
    it('Should return an error if plan is not public', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: false });

        request.post(`${BASE_URL}/createExplorerCheckoutSession`)
            .send({ data: { explorerId: 1, stripePlanSlug: 'slug' }})
            .expect(400) 
            .then(({ text }) => {
                expect(text).toEqual(`Coouldn't find plan.`);
                done();
            });
    });

    it('Should return an error if explorer does not exist', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/createExplorerCheckoutSession`)
            .send({ data: { explorerId: 1, stripePlanSlug: 'slug' }})
            .expect(400) 
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't find explorer.`);
                done();
            });
    });

    it('Should return a 200 with a session url for non trial subscription', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: '1234', canTrial: false });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true, stripePriceId: 'priceId' });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/createExplorerCheckoutSession`)
            .send({
                data: {
                    explorerId: 1,
                    stripePlanSlug: 'slug',
                    successUrl: 'http://ethernal.com/explorers/1?status=success',
                    cancelUrl: 'http://ethernal.com/explorers/1'
                }
            })
            .expect(200) 
            .then(({ body }) => {
                expect(mockSessionCreate).toHaveBeenCalledWith({
                    mode: 'subscription',
                    payment_method_collection: 'always',
                    client_reference_id: 1,
                    customer: '1234',
                    subscription_data: { metadata: { explorerId: 1 }},
                    line_items: [
                        {
                            price: 'priceId',
                            quantity: 1
                        }
                    ],
                    success_url: 'http://ethernal.com/explorers/1?status=success',
                    cancel_url: 'http://ethernal.com/explorers/1'
                });
                expect(body).toEqual({ url : 'https://stripe.com' });
                done();
            });
   });

   it('Should return a 200 with a session url for a trial subscription', (done) => {
    jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: '1234', canTrial: true });
    jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true, stripePriceId: 'priceId' });
    jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });

    request.post(`${BASE_URL}/createExplorerCheckoutSession`)
        .send({
            data: {
                explorerId: 1,
                stripePlanSlug: 'slug',
                successUrl: 'http://ethernal.com/explorers/1?status=success',
                cancelUrl: 'http://ethernal.com/explorers/1'
            }
        })
        .expect(200)
        .then(({ body }) => {
            expect(mockSessionCreate).toHaveBeenCalledWith({
                mode: 'subscription',
                payment_method_collection: 'if_required',
                client_reference_id: 1,
                customer: '1234',
                subscription_data: {
                    trial_period_days: 7,
                    trial_settings: {
                        end_behavior: { missing_payment_method: 'cancel' }
                    },
                    metadata: { explorerId: 1 }
                },
                line_items: [
                    {
                        price: 'priceId',
                        quantity: 1
                    }
                ],
                success_url: 'http://ethernal.com/explorers/1?status=success',
                cancel_url: 'http://ethernal.com/explorers/1'
            });
            expect(body).toEqual({ url : 'https://stripe.com' });
            done();
        });
});
});

describe(`GET ${BASE_URL}/createPortalSession`, () => {
     it('Should return a 200 with a session url', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ uid: '123', stripeCustomerId: '1234' });
        request.post(`${BASE_URL}/createPortalSession`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ url : 'https://stripe.com' });
                done();
            });
    });
});
