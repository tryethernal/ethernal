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

const buildSequelize = () => {
    const sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
    const Block = blockFactory(sequelize, DataTypes);
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

    const statements = () => query.mock.calls.map(c => (typeof c[0] === 'string' ? c[0] : c[0].query));
    const deletes = () => statements().filter(sql => sql.startsWith('DELETE'));
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

describe('Block#checkPartial', () => {
    let sequelize, Block, block, count, safeDestroy;
    const GRACE = 60 * 60 * 1000;

    beforeEach(() => {
        ({ sequelize, Block } = buildSequelize());
        count = jest.spyOn(sequelize.models.Transaction, 'count');
        jest.spyOn(sequelize, 'transaction').mockImplementation(async (options, cb) => cb('db-transaction'));
        safeDestroy = jest.spyOn(Block.prototype, 'safeDestroy').mockResolvedValue();
        block = Block.build({ id: BLOCK_ID, workspaceId: WORKSPACE_ID, transactionsCount: 2, createdAt: new Date() }, { isNewRecord: false, raw: true });
    });

    afterEach(() => jest.restoreAllMocks());

    const oldDate = () => new Date(Date.now() - GRACE - 1000);

    it('Should defer a young block that still has syncing transactions', async () => {
        count.mockResolvedValueOnce(3);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('deferred');
        expect(safeDestroy).not.toHaveBeenCalled();
    });

    it('Should revert a block with syncing transactions once it is older than the grace period', async () => {
        block.setDataValue('createdAt', oldDate());
        count.mockResolvedValueOnce(3);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
        expect(safeDestroy).toHaveBeenCalledWith('db-transaction');
    });

    it('Should revert a block with syncing transactions when createdAt is unknown', async () => {
        block.setDataValue('createdAt', undefined);
        count.mockResolvedValueOnce(3);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
    });

    it('Should revert a transaction count mismatch immediately, even when young', async () => {
        count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('reverted');
        expect(safeDestroy).toHaveBeenCalled();
    });

    it('Should report a complete block', async () => {
        count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

        expect(await block.checkPartial({ syncingGraceMs: GRACE })).toEqual('complete');
        expect(safeDestroy).not.toHaveBeenCalled();
    });

    describe('revertIfPartial', () => {
        it('Should keep reverting a young block with syncing transactions', async () => {
            count.mockResolvedValueOnce(3);

            expect(await block.revertIfPartial()).toEqual(true);
            expect(safeDestroy).toHaveBeenCalled();
        });

        it('Should return false for a complete block', async () => {
            count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

            expect(await block.revertIfPartial()).toEqual(false);
        });
    });
});
