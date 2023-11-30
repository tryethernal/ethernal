const mockCustomerRetrieve = jest.fn();
const mockSubscriptionUpdate = jest.fn();
const mockSubscriptionRetrieve = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            customers: {
                retrieve: mockCustomerRetrieve
            },
            paymentIntents: {
                retrieve: jest.fn().mockResolvedValue({ payment_method: true })
            },
            subscriptions: {
                update: mockSubscriptionUpdate,
                retrieve: mockSubscriptionRetrieve
            }
        }
    });
});
require('../mocks/lib/firebase');
const { StripePlan, Explorer } = require('../mocks/models');
const db = require('../../lib/firebase');
const { handleStripePaymentSucceeded, handleStripeSubscriptionUpdate, handleStripeSubscriptionDeletion } = require('../../lib/stripe');
const StripePaymentSucceededWebhookBody = require('../fixtures/StripePaymentSucceededWebhookBody');

beforeEach(() => jest.clearAllMocks());

describe('renewSubscriptionCycle', () => {
    it('Should return if cannot find user', (done) => {
        const data = {
            billing_reason: 'subscription_cycle',
            customer: 'cus_123',
            subscription_details: {
                metadata: { explorerId: 1 }
            }
        };

        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce(null);
        handleStripePaymentSucceeded(data)
            .then(res => {
                expect(res).toEqual('Cannot find user');
                done();
            });
    });

    it('Should return if cannot find explorer', (done) => {
        const data = {
            billing_reason: 'subscription_cycle',
            customer: 'cus_123',
            subscription_details: {
                metadata: { explorerId: 1 }
            }
        };

        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        handleStripePaymentSucceeded(data)
            .then(res => {
                expect(res).toEqual('Cannot find explorer');
                done();
            });
    });

    it('Should return if no active subscription', (done) => {
        const data = {
            billing_reason: 'subscription_cycle',
            customer: 'cus_123',
            subscription_details: {
                metadata: { explorerId: 1 }
            }
        };

        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({});
        handleStripePaymentSucceeded(data)
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should reset transaction quota if subscription has been created', (done) => {
        const data = {
            billing_reason: 'subscription_create',
            customer: 'cus_123',
            subscription_details: {
                metadata: { explorerId: 1 }
            }
        };

        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1, stripeSubscription: {} });
        mockSubscriptionRetrieve.mockResolvedValueOnce({ metadata: { explorerId: 1 }});
        handleStripePaymentSucceeded(data)
            .then(() => {
                expect(db.resetExplorerTransactionQuota).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should reset transaction quota if subscription is renewing', (done) => {
        const data = {
            billing_reason: 'subscription_cycle',
            customer: 'cus_123',
            subscription_details: {
                metadata: { explorerId: 1 }
            }
        };

        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1, stripeSubscription: {} });
        handleStripePaymentSucceeded(data)
            .then(() => {
                expect(db.resetExplorerTransactionQuota).toHaveBeenCalledWith(1, 1);
                done();
            });
    });
});

describe('handleStripeSubscriptionDeletion', () => {
    it('Should return if subscription is not canceled', (done) => {
        handleStripeSubscriptionDeletion({ metadata: { explorerId: 1 }, status: 'active' })
            .then(res => {
                expect(res).toEqual('Subscription is not canceled');
                expect(db.getUserbyStripeCustomerId).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should return if user does not exist', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce(null);

        handleStripeSubscriptionDeletion({ metadata: { explorerId: 1 }, status: 'canceled' })
            .then(res => {
                expect(res).toEqual('Cannot find user');
                expect(db.getExplorerById).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should return if explorer does not exist', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        handleStripeSubscriptionDeletion({ metadata: { explorerId: 1 }, status: 'canceled' })
            .then(res => {
                expect(res).toEqual('Cannot find explorer');
                done();
            });
    });

    it('Should delete the subscription', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 1 }});

        handleStripeSubscriptionDeletion({ id: 1, metadata: { explorerId: 1 }, status: 'canceled' })
            .then(res => {
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1, 1);
                done();
            });
    });
});

describe('handleStripeSubscriptionUpdate', () => {
    it('Should return if subscription is not active', (done) => {
        handleStripeSubscriptionUpdate({ metadata: { explorerId: 1 }, status: 'canceled' })
            .then(res => {
                expect(res).toEqual('Inactive subscription');
                expect(db.getUserbyStripeCustomerId).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should return if user does not exist', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce(null);

        handleStripeSubscriptionUpdate({ metadata: { explorerId: 1 }, status: 'active' })
            .then(res => {
                expect(res).toEqual('Cannot find user');
                expect(db.getExplorerById).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should return if explorer does not exist', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        handleStripeSubscriptionUpdate({ metadata: { explorerId: 1 }, status: 'active' })
            .then(res => {
                expect(res).toEqual('Cannot find explorer');
                done();
            });
    });

    it('Should cancel & return', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({});

        handleStripeSubscriptionUpdate({ metadata: { explorerId: 1 }, status: 'active', cancel_at_period_end: true })
            .then(res => {
                expect(res).toEqual('Subscription canceled');
                expect(db.cancelExplorerSubscription).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should revert the cancelation', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1, stripeSubscription: { isPendingCancelation: true }});
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });

        const data = {
            metadata: { explorerId: 1 },
            status: 'active',
            cancel_at_period_end: false,
            items: {
                data: [{ price: { id: '1234' }}]
            }
        };

        handleStripeSubscriptionUpdate(data)
            .then(res => {
                expect(db.revertExplorerSubscriptionCancelation).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should update the subscription plan', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1, stripeSubscription: { isPendingCancelation: false }});
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });
        mockCustomerRetrieve.mockResolvedValueOnce({ id: 1 });

        const data = {
            metadata: { explorerId: 1 },
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: 0,
            items: {
                data: [{ price: { id: '1234' }}]
            }
        };

        handleStripeSubscriptionUpdate(data)
            .then(() => {
                expect(db.updateExplorerSubscription).toHaveBeenCalledWith(1, 1, 1, { ...data, customer: { id: 1 }});
                done();
            });
    });

    it('Should create the subscription', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });
        mockCustomerRetrieve.mockResolvedValueOnce({ id: 1 });

        const data = {
            current_period_end: 1,
            id: 1,
            metadata: { explorerId: 1 },
            status: 'active',
            cancel_at_period_end: false,
            items: {
                data: [{ price: { id: '1234' }}]
            }
        };

        handleStripeSubscriptionUpdate(data)
            .then(res => {
                expect(db.createExplorerSubscription).toHaveBeenCalledWith(1, 1, 1, { ...data, customer: { id: 1 }});
                done();
            });
    });

    it('Should disable trials for user', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });
        mockCustomerRetrieve.mockResolvedValueOnce({ id: 1 });

        const data = {
            current_period_end: 1,
            id: 1,
            metadata: { explorerId: 1 },
            status: 'trialing',
            cancel_at_period_end: false,
            items: {
                data: [{ price: { id: '1234' }}]
            }
        };

        handleStripeSubscriptionUpdate(data)
            .then(() => {
                expect(db.disableUserTrial).toHaveBeenCalledWith(1);
                done();
            });
    });
});

describe('handleStripePaymentSucceeded', () => {
    it('Should return true when event has payment intent', async () => {
        mockSubscriptionUpdate.mockResolvedValueOnce({});
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });

        const data = {
            billing_reason: 'subscription_create',
            subscription: '1',
            payment_intent: '1',
            metadata: {}
        };

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    });

    it('Should return true when event has no payment intent', async () => {
        mockSubscriptionRetrieve.mockResolvedValue(true);
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });
        const data = {
            ...StripePaymentSucceededWebhookBody.data.object,
            metadata: {},
            payment_intent: null
        };

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    })
});