/**
 * @fileoverview Tests for Block.safeDestroy (set-based revert) and Block.checkPartial.
 *
 * The models are registered on an unconnected Sequelize instance and `sequelize.query` is
 * captured, so the SQL really emitted by the delete path is asserted without a database.
 */

jest.mock('../../lib/pusher');
jest.mock('../../lib/queue');

const { Sequelize, DataTypes } = require('sequelize');
const blockFactory = require('../../models/block');

const WORKSPACE_ID = 7;
const BLOCK_ID = 42;

/**
 * Builds an unconnected Sequelize instance with the models Block#safeDestroy touches.
 * @returns {{ sequelize: Object, Block: Object }}
 */
const buildSequelize = () => {
    const sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
    const Block = blockFactory(sequelize, DataTypes);
    /** Defines a stand-in model. @param {string} name @param {string} tableName @param {Object} [extra] @returns {Object} */
    const stand = (name, tableName, extra = {}) => sequelize.define(name, {
        workspaceId: DataTypes.INTEGER,
        timestamp: { type: DataTypes.DATE, primaryKey: true },
        ...extra
    }, { tableName, timestamps: false });

    stand('Transaction', 'transactions', { blockId: DataTypes.INTEGER, state: DataTypes.STRING });
    stand('TransactionTraceStep', 'transaction_trace_steps', { transactionId: DataTypes.INTEGER });
    stand('TransactionEvent', 'transaction_events', { transactionId: DataTypes.INTEGER });
    stand('TokenBalanceChangeEvent', 'token_balance_change_events', { tokenBalanceChangeId: DataTypes.INTEGER });
    stand('TokenBalanceChange', 'token_balance_changes', { transactionId: DataTypes.INTEGER, tokenTransferId: DataTypes.INTEGER });
    stand('TokenTransferEvent', 'token_transfer_events', { tokenTransferId: DataTypes.INTEGER });
    stand('TokenTransfer', 'token_transfers', { transactionId: DataTypes.INTEGER, transactionLogId: DataTypes.INTEGER });
    stand('TransactionLog', 'transaction_logs', { transactionReceiptId: DataTypes.INTEGER });
    stand('TransactionReceipt', 'transaction_receipts', { transactionId: DataTypes.INTEGER });
    stand('Contract', 'contracts', { transactionId: DataTypes.INTEGER });
    stand('BlockEvent', 'block_events', { blockId: DataTypes.INTEGER });
    stand('Explorer', 'explorers');
    stand('Workspace', 'workspaces');
    stand('StripePlan', 'stripe_plans');
    stand('StripeSubscription', 'stripe_subscriptions', { transactionQuota: DataTypes.INTEGER });

    return { sequelize, Block };
};

describe('Block#safeDestroy', () => {
    let sequelize, Block, query, block;
    const dbTransaction = { id: 'fake-transaction' };

    beforeEach(() => {
        ({ sequelize, Block } = buildSequelize());
        query = jest.spyOn(sequelize, 'query').mockImplementation(async (sql, options = {}) => {
            if (options.type === 'SELECT')
                return [{ id: 100 }, { id: 101 }, { id: 102 }];
            return 0;
        });
        block = Block.build({ id: BLOCK_ID, workspaceId: WORKSPACE_ID }, { isNewRecord: false });
    });

    /** @returns {string[]} SQL of every query issued */
    const statements = () => query.mock.calls.map(c => (typeof c[0] === 'string' ? c[0] : c[0].query));
    /** @returns {string[]} SQL of every DELETE issued */
    const deletes = () => statements().filter(sql => sql.startsWith('DELETE'));
    /** @returns {string[]} Tables deleted from, in order */
    const tablesDeleted = () => deletes().map(sql => sql.match(/DELETE FROM "(\w+)"/)[1]);

    it('Should delete each dependent table once, set-based, children first', async () => {
        await block.safeDestroy(dbTransaction);

        expect(tablesDeleted()).toEqual([
            'transaction_trace_steps',
            'transaction_events',
            'token_balance_change_events',
            'token_balance_changes',
            'token_transfer_events',
            'token_transfers',
            'transaction_logs',
            'transaction_receipts',
            'transactions',
            'block_events',
            'blocks'
        ]);
    });

    it('Should not loop per transaction: statement count does not depend on the number of transactions', async () => {
        await block.safeDestroy(dbTransaction);
        const withThree = query.mock.calls.length;

        query.mockClear();
        query.mockImplementation(async (sql, options = {}) => options.type === 'SELECT'
            ? Array.from({ length: 500 }, (_, i) => ({ id: i + 1 }))
            : 0);
        await block.safeDestroy(dbTransaction);

        expect(query.mock.calls.length).toEqual(withThree);
        // 1 select + 11 deletes/updates on dependents + block
        expect(withThree).toEqual(1 + 11 + 1);
    });

    it('Should select the transaction ids once, scoped to the block and workspace', async () => {
        await block.safeDestroy(dbTransaction);

        const selects = statements().filter(sql => sql.startsWith('SELECT'));
        expect(selects).toHaveLength(1);
        expect(selects[0]).toContain('FROM "transactions"');
        expect(selects[0]).toContain(`"blockId" = ${BLOCK_ID}`);
        expect(selects[0]).toContain(`"workspaceId" = ${WORKSPACE_ID}`);
    });

    it('Should filter every dependent delete by workspaceId and never by timestamp', async () => {
        await block.safeDestroy(dbTransaction);

        deletes()
            .filter(sql => !sql.startsWith('DELETE FROM "blocks"'))
            .forEach(sql => {
                expect(sql).toContain(`"workspaceId" = ${WORKSPACE_ID}`);
                expect(sql).not.toContain('"timestamp"');
            });
    });

    it('Should scope the id sets to the block\'s transactions', async () => {
        await block.safeDestroy(dbTransaction);

        const byTable = Object.fromEntries(deletes().map(sql => [sql.match(/DELETE FROM "(\w+)"/)[1], sql]));
        expect(byTable.transaction_trace_steps).toContain('"transactionId" IN (100, 101, 102)');
        expect(byTable.transaction_events).toContain('"transactionId" IN (100, 101, 102)');
        expect(byTable.transaction_receipts).toContain('"transactionId" IN (100, 101, 102)');
        expect(byTable.transactions).toContain(`"blockId" = ${BLOCK_ID}`);
        expect(byTable.token_balance_change_events).toContain('FROM token_balance_changes');
        expect(byTable.token_balance_changes).toContain('FROM token_transfers');
        expect(byTable.token_transfer_events).toContain('FROM token_transfers');
        expect(byTable.token_transfers).toContain('FROM transaction_logs');
        expect(byTable.transaction_logs).toContain('FROM transaction_receipts');
        expect(byTable.block_events).toContain(`"blockId" = ${BLOCK_ID}`);
    });

    it('Should unlink contracts created by the block\'s transactions', async () => {
        await block.safeDestroy(dbTransaction);

        const update = statements().find(sql => sql.startsWith('UPDATE "contracts"'));
        const call = query.mock.calls.find(c => (typeof c[0] === 'string' ? c[0] : c[0].query) === update);
        const bind = typeof call[0] === 'string' ? call[1].bind : call[0].bind;
        expect(update).toContain('SET "transactionId"=$1');
        expect(bind).toEqual([null, WORKSPACE_ID]);
        expect(update).toContain('"transactionId" IN (100, 101, 102)');
    });

    it('Should run every statement in the given transaction', async () => {
        await block.safeDestroy(dbTransaction);

        query.mock.calls.forEach(([, options]) => expect(options.transaction).toEqual(dbTransaction));
    });

    it('Should skip transaction dependents when the block has no transaction', async () => {
        query.mockImplementation(async (sql, options = {}) => options.type === 'SELECT' ? [] : 0);

        await block.safeDestroy(dbTransaction);

        expect(tablesDeleted()).toEqual(['block_events', 'blocks']);
    });

    it('Should throw if the block has no workspaceId', async () => {
        const orphan = Block.build({ id: BLOCK_ID }, { isNewRecord: false });

        await expect(orphan.safeDestroy(dbTransaction)).rejects.toThrow('workspaceId');
        expect(query).not.toHaveBeenCalled();
    });
});


describe('Block#safeDestroy quota', () => {
    let sequelize, Block, query, block, findExplorer;
    const dbTransaction = { id: 'fake-transaction' };
    const SUBSCRIPTION_ID = 99;
    const originalSelfHosted = process.env.SELF_HOSTED;
    const originalPlanSlug = process.env.DEFAULT_PLAN_SLUG;

    /**
     * Builds an explorer stub as returned by the quota lookup in Block#safeDestroy.
     * @param {Object} [options]
     * @param {string} [options.planSlug='demo'] - Plan slug
     * @param {boolean} [options.isPublic=true] - Whether the workspace is public
     * @param {boolean} [options.subscription=true] - Whether the explorer has a subscription
     * @returns {Object} Explorer stub
     */
    const explorerOn = ({ planSlug = 'demo', isPublic = true, subscription = true } = {}) => ({
        id: 1,
        workspace: { id: WORKSPACE_ID, public: isPublic },
        stripeSubscription: subscription ? { id: SUBSCRIPTION_ID, stripePlan: { id: 3, slug: planSlug } } : null
    });
    /** @returns {Array} Calls that updated the subscription quota */
    const quotaUpdates = () => query.mock.calls
        .map(c => (typeof c[0] === 'string' ? c[0] : c[0].query))
        .filter(sql => sql.startsWith('UPDATE "stripe_subscriptions"'));

    beforeEach(() => {
        delete process.env.SELF_HOSTED;
        process.env.DEFAULT_PLAN_SLUG = 'demo';
        ({ sequelize, Block } = buildSequelize());
        query = jest.spyOn(sequelize, 'query').mockImplementation(async (sql, options = {}) => {
            if (options.type === 'SELECT')
                return [{ id: 100 }, { id: 101 }, { id: 102 }];
            // Sequelize reports the number of rows removed by the transactions delete
            return typeof sql === 'string' && sql.startsWith('DELETE FROM "transactions"') ? 3 : 0;
        });
        findExplorer = jest.spyOn(sequelize.models.Explorer, 'findOne').mockResolvedValue(explorerOn());
        block = Block.build({ id: BLOCK_ID, workspaceId: WORKSPACE_ID }, { isNewRecord: false });
    });

    afterAll(() => {
        if (originalSelfHosted === undefined) delete process.env.SELF_HOSTED; else process.env.SELF_HOSTED = originalSelfHosted;
        if (originalPlanSlug === undefined) delete process.env.DEFAULT_PLAN_SLUG; else process.env.DEFAULT_PLAN_SLUG = originalPlanSlug;
    });

    it('Should give the deleted transactions back to a demo-plan public explorer, floored at 0, in one statement', async () => {
        await block.safeDestroy(dbTransaction);

        expect(findExplorer).toHaveBeenCalledTimes(1);
        expect(findExplorer.mock.calls[0][0].transaction).toBe(dbTransaction);
        const updates = quotaUpdates();
        expect(updates).toHaveLength(1);
        expect(updates[0]).toContain('GREATEST("transactionQuota" - 3, 0)');
        const call = query.mock.calls.find(c => (typeof c[0] === 'string' ? c[0] : c[0].query) === updates[0]);
        const bind = typeof call[0] === 'string' ? call[1].bind : call[0].bind;
        expect(updates[0]).toContain('WHERE "id" = $1');
        expect(bind).toEqual([SUBSCRIPTION_ID]);
    });

    it('Should run the decrement last, after the block is deleted', async () => {
        await block.safeDestroy(dbTransaction);

        const sqls = query.mock.calls.map(c => (typeof c[0] === 'string' ? c[0] : c[0].query));
        expect(sqls[sqls.length - 1]).toContain('UPDATE "stripe_subscriptions"');
        expect(sqls[sqls.length - 2]).toContain('DELETE FROM "blocks"');
    });

    it('Should not touch the quota of a paying plan', async () => {
        findExplorer.mockResolvedValue(explorerOn({ planSlug: 'explorer-150' }));

        await block.safeDestroy(dbTransaction);

        expect(quotaUpdates()).toHaveLength(0);
    });

    it('Should not touch the quota of a private workspace', async () => {
        findExplorer.mockResolvedValue(explorerOn({ isPublic: false }));

        await block.safeDestroy(dbTransaction);

        expect(quotaUpdates()).toHaveLength(0);
    });

    it('Should not touch the quota when there is no explorer or subscription', async () => {
        findExplorer.mockResolvedValue(null);
        await block.safeDestroy(dbTransaction);
        findExplorer.mockResolvedValue(explorerOn({ subscription: false }));
        await block.safeDestroy(dbTransaction);

        expect(quotaUpdates()).toHaveLength(0);
    });

    it('Should not touch the quota on self-hosted instances, nor even load the explorer', async () => {
        process.env.SELF_HOSTED = 'true';

        await block.safeDestroy(dbTransaction);

        expect(findExplorer).not.toHaveBeenCalled();
        expect(quotaUpdates()).toHaveLength(0);
    });

    it('Should not load the explorer when no default plan is configured', async () => {
        delete process.env.DEFAULT_PLAN_SLUG;

        await block.safeDestroy(dbTransaction);

        expect(findExplorer).not.toHaveBeenCalled();
        expect(quotaUpdates()).toHaveLength(0);
    });

    it('Should not load the explorer nor update anything for a block without transactions', async () => {
        query.mockImplementation(async (sql, options = {}) => options.type === 'SELECT' ? [] : 0);

        await block.safeDestroy(dbTransaction);

        expect(findExplorer).not.toHaveBeenCalled();
        expect(quotaUpdates()).toHaveLength(0);
    });
});

describe('Block#checkPartial', () => {
    let sequelize, Block, block, findAll, safeDestroy;
    const GRACE = 60 * 60 * 1000;

    beforeEach(() => {
        ({ sequelize, Block } = buildSequelize());
        findAll = jest.spyOn(sequelize.models.Transaction, 'findAll');
        jest.spyOn(sequelize, 'transaction').mockImplementation(async (options, cb) => cb('db-transaction'));
        safeDestroy = jest.spyOn(Block.prototype, 'safeDestroy').mockResolvedValue();
        block = Block.build({ id: BLOCK_ID, workspaceId: WORKSPACE_ID, transactionsCount: 2, createdAt: new Date() }, { isNewRecord: false, raw: true });
    });

    afterEach(() => jest.restoreAllMocks());

    /** @returns {Date} A createdAt older than the grace period */
    const oldDate = () => new Date(Date.now() - GRACE - 1000);
    // COUNT() comes back from PostgreSQL as strings
    /** Mocks the next count query. @param {number} total @param {number} syncing @returns {Object} */
    const counts = (total, syncing) => findAll.mockResolvedValueOnce([{ total: String(total), syncing: String(syncing) }]);

    it('Should count total and syncing transactions in a single query scoped to the block and workspace', async () => {
        counts(2, 0);

        await block.checkPartial({ syncingGraceMs: GRACE });

        expect(findAll).toHaveBeenCalledTimes(1);
        expect(findAll.mock.calls[0][0].where).toEqual({ blockId: BLOCK_ID, workspaceId: WORKSPACE_ID });
        expect(findAll.mock.calls[0][0].raw).toEqual(true);
    });

    it('Should defer a young block that still has syncing transactions', async () => {
        counts(2, 2);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('deferred');
        expect(safeDestroy).not.toHaveBeenCalled();
    });

    it('Should revert a block with syncing transactions once it is older than the grace period', async () => {
        block.setDataValue('createdAt', oldDate());
        counts(2, 2);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
        expect(safeDestroy).toHaveBeenCalledWith('db-transaction');
    });

    it('Should revert a block with syncing transactions when createdAt is unknown', async () => {
        block.setDataValue('createdAt', undefined);
        counts(2, 2);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
    });

    it('Should revert a transaction count mismatch immediately, even when young', async () => {
        counts(1, 0);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
        expect(safeDestroy).toHaveBeenCalled();
    });

    it('Should revert a transaction count mismatch immediately even when transactions are also syncing', async () => {
        counts(1, 1);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
        expect(safeDestroy).toHaveBeenCalledWith('db-transaction');
    });

    it('Should not check the transaction count when the block does not know it', async () => {
        block.setDataValue('transactionsCount', null);
        counts(5, 0);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('complete');
        expect(safeDestroy).not.toHaveBeenCalled();
    });

    it('Should report a complete block', async () => {
        counts(2, 0);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('complete');
        expect(safeDestroy).not.toHaveBeenCalled();
    });

    describe('revertIfPartial', () => {
        it('Should keep reverting a young block with syncing transactions', async () => {
            counts(2, 2);

            expect(await block.revertIfPartial()).toEqual(true);
            expect(safeDestroy).toHaveBeenCalled();
        });

        it('Should revert a transaction count mismatch', async () => {
            counts(1, 0);

            expect(await block.revertIfPartial()).toEqual(true);
        });

        it('Should return false for a complete block', async () => {
            counts(2, 0);

            expect(await block.revertIfPartial()).toEqual(false);
        });
    });
});
