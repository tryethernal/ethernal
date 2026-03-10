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
const { Block, Transaction } = require('../mocks/models');

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
            isReady: true,
            transactionsCount: 1,
            workspace: { explorer: null }
        });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No explorer');
                done();
            });
    });

    it('Should return an error if no active subscription', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            isReady: true,
            transactionsCount: 1,
            workspace: {
                explorer: {
                    stripeSubscription: null
                }
            }
        });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should increment and not call stripe is billing is flat', (done) => {
        const increment = jest.fn().mockResolvedValue();
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            isReady: true,
            transactionsCount: 1,
            workspace: {
                explorer: {
                    stripeSubscription: {
                        increment,
                        stripePlan: {
                            capabilities: { billing: 'flat' }
                        }
                    }
                }
            }
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
        mockSubscriptionRetrieve.mockResolvedValue({ items: { data: [{ id: 'id' }]}});
        mockCreateUsageRecord.mockResolvedValue();
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: 1,
            workspace: {
                explorer: {
                    stripeSubscription: {
                        increment,
                        stripeId: 'stripe_sub_123',
                        stripePlan: {
                            capabilities: { billing: 'metered' }
                        }
                    }
                }
            }
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
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isReady: true,
            transactionsCount: null, // Force fallback to count
            workspace: {
                explorer: {
                    stripeSubscription: {
                        increment,
                        stripePlan: {
                            capabilities: { billing: 'flat' }
                        }
                    }
                }
            }
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
});
