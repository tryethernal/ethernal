const mockSubscriptionRetrieve = jest.fn();
const mockCreateUsageRecord = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            subscriptions: {
                retrieve: mockSubscriptionRetrieve
            },
            subscriptionItems: {
                createUsageRecord: mockCreateUsageRecord
            }
        }
    });
});
require('../mocks/lib/queue');
const { Block, Transaction, Explorer, StripeSubscription, StripePlan } = require('../mocks/models');

const increaseStripeBillingQuota = require('../../jobs/increaseStripeBillingQuota');

beforeEach(() => jest.clearAllMocks());

describe('increaseStripeBillingQuota', () => {
    it('Should return an error if no block', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce(null);

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find block');
                done();
            });
    });

    it('Should return an error if block is not ready', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            isReady: false,
            transactionsCount: 1,
            workspace: { explorer: null }
        });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Block is not ready');
                done();
            });
    });

    it('Should return an error if block is empty', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            isReady: true,
            transactionsCount: 0,
            workspace: { explorer: null }
        });
        const transactionCountSpy = jest.spyOn(Transaction, 'count');

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Block is empty');
                expect(transactionCountSpy).not.toHaveBeenCalled(); // Should not call Transaction.count when transactionsCount is 0
                done();
            });
    });

    it('Should return an error if no explorer', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No explorer');
                done();
            });
    });

    it('Should return an error if no active subscription', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce(null);

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should return an error if no stripe plan found', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce({
            id: 1,
            stripeId: 'sub_123',
            stripePlanId: 1
        });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce(null);

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No stripe plan found');
                done();
            });
    });

    it('Should increment and not call stripe is billing is flat', (done) => {
        const increment = jest.fn().mockResolvedValue();
        const stripeSubscription = {
            id: 1,
            stripeId: 'sub_123',
            transactionQuota: 100,
            stripePlanId: 1,
            increment
        };

        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce(stripeSubscription);
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({
            capabilities: { billing: 'flat' }
        });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(increment).toHaveBeenCalledWith('transactionQuota', { by: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should increment and call stripe is billing is metered', (done) => {
        const increment = jest.fn().mockResolvedValue();
        const stripeSubscription = {
            id: 1,
            stripeId: 'stripe_sub_123',
            transactionQuota: 100,
            stripePlanId: 1,
            increment
        };

        mockSubscriptionRetrieve.mockResolvedValue({ items: { data: [{ id: 'id' }]}});
        mockCreateUsageRecord.mockResolvedValue();

        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce(stripeSubscription);
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({
            capabilities: { billing: 'metered' }
        });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(increment).toHaveBeenCalledWith('transactionQuota', { by: 1 });
                expect(mockCreateUsageRecord).toHaveBeenCalledWith('id', { quantity: 1 }, { idempotencyKey: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should use Transaction.count when transactionsCount is not available', (done) => {
        const increment = jest.fn().mockResolvedValue();
        const stripeSubscription = {
            id: 1,
            stripeId: 'sub_123',
            transactionQuota: 100,
            stripePlanId: 1,
            increment
        };

        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: null, // Force fallback to count
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce(stripeSubscription);
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({
            capabilities: { billing: 'flat' }
        });
        jest.spyOn(Transaction, 'count').mockResolvedValueOnce(2);

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(Transaction.count).toHaveBeenCalledWith({
                    where: { blockId: 1 }
                });
                expect(increment).toHaveBeenCalledWith('transactionQuota', { by: 2 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should use optimized Block.findOne query when workspaceId is provided', (done) => {
        const increment = jest.fn().mockResolvedValue();
        const stripeSubscription = {
            id: 1,
            stripeId: 'sub_123',
            transactionQuota: 100,
            stripePlanId: 1,
            increment
        };

        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspaceId: 1
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripeSubscription, 'findOne').mockResolvedValueOnce(stripeSubscription);
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({
            capabilities: { billing: 'flat' }
        });

        increaseStripeBillingQuota({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({
                    where: { id: 1, workspaceId: 1 },
                    attributes: ['id', 'isReady', 'transactionsCount', 'workspaceId']
                });
                expect(increment).toHaveBeenCalledWith('transactionQuota', { by: 1 });
                expect(res).toEqual(true);
                done();
            });
    });
});
