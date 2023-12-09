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
const { Block } = require('../mocks/models');

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
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ isReady: false });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Block is not ready');
                done();
            });
    });

    it('Should return an error if block is empty', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ isReady: true, transactions: [] });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Block is empty');
                done();
            });
    });

    it('Should return an error if no explorer', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ isReady: true, transactions: [{}], workspace: {} });

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No explorer');
                done();
            });
    });

    it('Should return an error if no active subscription', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ isReady: true, transactions: [{}], workspace: { explorer: {} }});

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should increment and not call stripe is billing is flat', (done) => {
        const increment = jest.fn().mockResolvedValue();
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ isReady: true, transactions: [{}], workspace: { explorer: { stripeSubscription: { increment, stripePlan: { capabilities: { billing: 'flat' }}}}}});

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
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ id: 1, isReady: true, transactions: [{}], workspace: { explorer: { stripeSubscription: { increment, stripePlan: { capabilities: { billing: 'metered' }}}}}});

        increaseStripeBillingQuota({ data: { blockId: 1 }})
            .then(res => {
                expect(increment).toHaveBeenCalledWith('transactionQuota', { by: 1 });
                expect(mockCreateUsageRecord).toHaveBeenCalledWith('id', { quantity: 1 }, { idempotencyKey: 1 });
                expect(res).toEqual(true);
                done();
            });
    });
});
