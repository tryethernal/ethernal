const mockSubscriptionRetrieve = jest.fn();
const mockSubscriptionCreate = jest.fn();
const mockSubscriptionUpdate = jest.fn();
const mockSessionCreate = jest.fn().mockResolvedValue({ url: 'https://stripe.com' })
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            billingPortal: {
                sessions: {
                    create: jest.fn().mockResolvedValue({ url: 'https://stripe.com' })
                }
            },
            subscriptions: {
                retrieve: mockSubscriptionRetrieve,
                create: mockSubscriptionCreate,
                update: mockSubscriptionUpdate
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
require('../mocks/middlewares/auth');
require('../mocks/lib/firebase');
const authMiddleware = require('../../middlewares/auth');

const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const stripeplan = require('../../models/stripeplan');
const request = supertest(app);

const BASE_URL = '/api/stripe';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/startCryptoSubscription`, () => {
    it('Should return an error if crypto payment is not enabled', (done) => {
        request.post(`${BASE_URL}/startCryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug', explorerId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Crypto payment is not available for your account. Please reach out to contact@tryethernal.com if you'd like to enable it.`);
                done();
            });
    });

    it('Should return an error if plan is not public', (done) => {
        authMiddleware.mockImplementation((req, res, next) => {
            req.body.data = { 
                ...(req.body.data || {}),
                uid: '123',
                user: { id: 1, cryptoPaymentEnabled: true }
            };
            next();
        });
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: false })

        request.post(`${BASE_URL}/startCryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug', explorerId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should create the subscription and return a 200', (done) => {
        authMiddleware.mockImplementation((req, res, next) => {
            req.body.data = { 
                ...(req.body.data || {}),
                uid: '123',
                user: { id: 1, cryptoPaymentEnabled: true, stripeCustomerId: 'customerId' }
            };
            next();
        });
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });

        request.post(`${BASE_URL}/startCryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug', explorerId: 1 }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionCreate).toBeCalledWith({
                    customer: 'customerId',
                    collection_method: 'send_invoice',
                    days_until_due: 7,
                    items: [
                        { price: 'priceId' }
                    ],
                    metadata: { explorerId: 1 }
                });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/cancelExplorerSubscription`, () => {
    it('Should return an error', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        request.post(`${BASE_URL}/cancelExplorerSubscription`)
            .send({ data: { explorerId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should cancel the subscription and return a 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 'subscriptionId' }});
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId' });

        request.post(`${BASE_URL}/cancelExplorerSubscription`)
            .send({ data: { explorerId: 1 }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).toHaveBeenCalledWith('subscriptionId');
                expect(mockSubscriptionUpdate).toBeCalledWith('subscriptionId', { cancel_at_period_end: true });
                expect(db.cancelExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });
});

describe(`POST ${BASE_URL}/updateExplorerSubscription`, () => {
    it('Should return an error if invalid explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.post(`${BASE_URL}/updateExplorerSubscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should return an error if plan is not public', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ explorerId: 1, stripeSubscription: { stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: false })

        request.post(`${BASE_URL}/updateExplorerSubscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should update the subscription and return a 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId', items: { data: [{ id: 'itemId' }]}});

        request.post(`${BASE_URL}/updateExplorerSubscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).toHaveBeenCalledWith('subscriptionId');
                expect(mockSubscriptionUpdate).toBeCalledWith('subscriptionId', {
                    cancel_at_period_end: false,
                    proration_behavior: 'always_invoice',
                    items: [{
                        id: 'itemId',
                        price: 'priceId'
                    }]
                });
                expect(db.updateExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });
});

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

    it('Should return a 200 with a session url', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: '1234' });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true, stripePriceId: 'priceId' });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/createExplorerCheckoutSession`)
            .send({ data: { explorerId: 1, stripePlanSlug: 'slug' }})
            .expect(200) 
            .then(({ body }) => {
                expect(mockSessionCreate).toHaveBeenCalledWith({
                    mode: 'subscription',
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
