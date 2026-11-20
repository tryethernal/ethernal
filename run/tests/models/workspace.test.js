/**
 * @fileoverview Tests for Workspace#safeCreatePartialBlock transaction quota counting.
 *
 * For explorers on the default (demo) plan the subscription's transactionQuota is incremented by the
 * block's transaction count in the same database transaction as the inserts, so the counter moves if
 * and only if the block is stored.
 *
 * The model is built against an unconnected Sequelize instance with stubbed sibling models: nothing
 * here runs a query.
 */

jest.mock('../../lib/logger');
jest.mock('../../lib/analytics');
jest.mock('../../lib/queue', () => ({
    enqueue: jest.fn().mockResolvedValue(),
    bulkEnqueue: jest.fn().mockResolvedValue()
}));

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
const Workspace = require('../../models/workspace')(sequelize, DataTypes);

const sequelizeTransaction = { id: 'tx' };
const calls = [];

sequelize.models.Block = {
    bulkCreate: jest.fn(async () => {
        calls.push('block');
        return [{ id: 5 }];
    })
};
sequelize.models.Transaction = {
    rawAttributes: { hash: {}, from: {}, to: {} },
    bulkCreate: jest.fn(async transactions => {
        calls.push('transactions');
        return transactions.map((transaction, i) => ({ id: i + 1, hash: transaction.hash }));
    })
};
sequelize.models.StripeSubscription = {
    increment: jest.fn(async () => calls.push('quota'))
};

/**
 * Builds a raw block the way blockSync hands it over.
 * @param {number} transactionCount - Number of transactions in the block
 * @returns {Object} Raw block
 */
const rawBlock = transactionCount => ({
    number: 1,
    hash: '0xblock',
    timestamp: 1700000000,
    transactions: Array.from({ length: transactionCount }, (_, i) => ({ hash: `0x${i}`, from: '0xa', to: '0xb' }))
});

let workspace;

beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    jest.spyOn(sequelize, 'transaction').mockImplementation(async callback => callback(sequelizeTransaction));
    workspace = Workspace.build({ id: 1 }, { isNewRecord: false });
    jest.spyOn(workspace, 'reload').mockResolvedValue({ id: 1, public: false });
});

describe('Workspace#safeCreatePartialBlock transaction quota', () => {
    it('Should increment the subscription quota by the transaction count, inside the transaction, after the inserts', async () => {
        const stored = await workspace.safeCreatePartialBlock(rawBlock(3), { quotaSubscriptionId: 42 });

        expect(stored.transactions).toHaveLength(3);
        expect(sequelize.models.StripeSubscription.increment).toHaveBeenCalledTimes(1);
        expect(sequelize.models.StripeSubscription.increment).toHaveBeenCalledWith('transactionQuota', {
            by: 3,
            where: { id: 42 },
            transaction: sequelizeTransaction
        });
        expect(calls).toEqual(['block', 'transactions', 'quota']);
    });

    it('Should not touch the quota when no subscription is given', async () => {
        await workspace.safeCreatePartialBlock(rawBlock(3));
        await workspace.safeCreatePartialBlock(rawBlock(3), {});
        await workspace.safeCreatePartialBlock(rawBlock(3), { quotaSubscriptionId: null });

        expect(sequelize.models.StripeSubscription.increment).not.toHaveBeenCalled();
    });

    it('Should not touch the quota for an empty block', async () => {
        await workspace.safeCreatePartialBlock(rawBlock(0), { quotaSubscriptionId: 42 });

        expect(sequelize.models.StripeSubscription.increment).not.toHaveBeenCalled();
    });

    it('Should not count a block that already exists', async () => {
        sequelize.models.Block.bulkCreate.mockResolvedValueOnce([{ id: null }]);

        const stored = await workspace.safeCreatePartialBlock(rawBlock(3), { quotaSubscriptionId: 42 });

        expect(stored).toBeNull();
        expect(sequelize.models.Transaction.bulkCreate).not.toHaveBeenCalled();
        expect(sequelize.models.StripeSubscription.increment).not.toHaveBeenCalled();
    });

    it('Should propagate a failing increment so the whole transaction rolls back', async () => {
        sequelize.models.StripeSubscription.increment.mockRejectedValueOnce(new Error('deadlock detected'));

        await expect(workspace.safeCreatePartialBlock(rawBlock(2), { quotaSubscriptionId: 42 }))
            .rejects.toThrow('deadlock detected');
    });
});
