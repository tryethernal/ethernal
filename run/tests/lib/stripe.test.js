require('../mocks/lib/stripe');
require('../mocks/lib/firebase');
const { StripePlan } = require('../mocks/models');
const db = require('../../lib/firebase');
const { handleStripePaymentSucceeded, handleStripeSubscriptionUpdate, handleStripeSubscriptionDeletion } = require('../../lib/stripe');
const StripePaymentSucceededWebhookBody = require('../fixtures/StripePaymentSucceededWebhookBody');

beforeEach(() => jest.clearAllMocks());

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

        handleStripeSubscriptionUpdate({ metadata: { explorerId: 1 }, status: 'active', cancel_at_period_end: true })
            .then(res => {
                expect(res).toEqual('Subscription canceled');
                expect(db.cancelExplorerSubscription).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should revert the cancelation', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { isPendingCancelation: true }});
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
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { isPendingCancelation: false }});
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });

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
            .then(res => {
                expect(db.updateExplorerSubscription).toHaveBeenCalledWith(1, 1, 1, new Date(0));
                done();
            });
    });

    it('Should create the subscription', (done) => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ id: 1 });

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
                expect(db.createExplorerSubscription).toHaveBeenCalledWith(1, 1, 1, 1, new Date(1000));
                done();
            });
    });
});

describe('handleStripePaymentSucceeded', () => {
    it('Should return true when event has payment intent', async () => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });
        const data = StripePaymentSucceededWebhookBody.data.object;

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    });

    it('Should return true when event has no payment intent', async () => {
        jest.spyOn(db, 'getUserbyStripeCustomerId').mockResolvedValueOnce({
            id: 1,
            firebaseUserId: 'abcd'
        });
        const data = {
            ...StripePaymentSucceededWebhookBody.data.object,
            payment_intent: null
        };

        const result = await handleStripePaymentSucceeded(data);

        expect(result).toBe(true);
    })
});