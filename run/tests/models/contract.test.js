/**
 * @fileoverview Tests for the Contract model hooks that queue `processContract`.
 *
 * `Workspace.safeCreateOrUpdateContract` creates contracts with `findOrCreate` inside an outer
 * transaction. Sequelize runs that create in a nested savepoint transaction which it never commits
 * itself, so `afterCommit` callbacks registered on it never fire. The hooks must register on the
 * outermost transaction instead.
 *
 * The model is built against an unconnected Sequelize instance: nothing here runs a query.
 */

jest.mock('../../lib/pusher');
jest.mock('../../lib/logger');
jest.mock('../../lib/queue', () => ({
    enqueue: jest.fn().mockResolvedValue(),
    bulkEnqueue: jest.fn().mockResolvedValue()
}));

const { Sequelize, DataTypes, Transaction } = require('sequelize');
const { enqueue, bulkEnqueue } = require('../../lib/queue');

const sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
const Contract = require('../../models/contract')(sequelize, DataTypes);

/**
 * Builds a root transaction and a savepoint transaction nested in it, the way `findOrCreate` does.
 * Only the database round trip of `commit` is stubbed: the hook loop is Sequelize's own.
 */
const buildTransactions = () => {
    const root = new Transaction(sequelize, {});
    root.cleanup = jest.fn();
    jest.spyOn(sequelize.getQueryInterface(), 'commitTransaction').mockResolvedValue();
    const nested = new Transaction(sequelize, { transaction: root });
    return { root, nested };
};

describe('Contract processContract hooks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('afterCreate', () => {
        it('Should enqueue immediately without a transaction', async () => {
            const contract = Contract.build({ id: 12, workspaceId: 1, address: '0xa1', patterns: [] });

            await Contract.runHooks('afterCreate', contract, {});

            expect(enqueue).toHaveBeenCalledWith('processContract', 'processContract-12', { contractId: 12 });
        });

        it('Should enqueue once the transaction commits', async () => {
            const { root } = buildTransactions();
            const contract = Contract.build({ id: 12, workspaceId: 1, address: '0xa1', patterns: [] });

            await Contract.runHooks('afterCreate', contract, { transaction: root });
            expect(enqueue).not.toHaveBeenCalled();

            await root.commit();
            expect(enqueue).toHaveBeenCalledTimes(1);
            expect(enqueue).toHaveBeenCalledWith('processContract', 'processContract-12', { contractId: 12 });
        });

        it('Should enqueue once the outer transaction commits when created in a nested transaction', async () => {
            const { root, nested } = buildTransactions();
            const contract = Contract.build({ id: 12, workspaceId: 1, address: '0xa1', patterns: [] });

            await Contract.runHooks('afterCreate', contract, { transaction: nested });
            expect(enqueue).not.toHaveBeenCalled();

            await root.commit();
            expect(enqueue).toHaveBeenCalledTimes(1);
            expect(enqueue).toHaveBeenCalledWith('processContract', 'processContract-12', { contractId: 12 });
        });

        it('Should not enqueue when the outer transaction never commits', async () => {
            const { nested } = buildTransactions();
            const contract = Contract.build({ id: 12, workspaceId: 1, address: '0xa1', patterns: [] });

            await Contract.runHooks('afterCreate', contract, { transaction: nested });

            expect(enqueue).not.toHaveBeenCalled();
        });
    });

    describe('afterBulkCreate', () => {
        const contracts = () => [
            Contract.build({ id: 1, workspaceId: 1, address: '0xa1', patterns: [] }),
            Contract.build({ id: 2, workspaceId: 1, address: '0xa2', patterns: [] })
        ];
        const expectedJobs = [
            { name: 'processContract-1', data: { contractId: 1 } },
            { name: 'processContract-2', data: { contractId: 2 } }
        ];

        it('Should enqueue immediately without a transaction', async () => {
            await Contract.runHooks('afterBulkCreate', contracts(), {});

            expect(bulkEnqueue).toHaveBeenCalledWith('processContract', expectedJobs);
        });

        it('Should enqueue once the outer transaction commits when created in a nested transaction', async () => {
            const { root, nested } = buildTransactions();

            await Contract.runHooks('afterBulkCreate', contracts(), { transaction: nested });
            expect(bulkEnqueue).not.toHaveBeenCalled();

            await root.commit();
            expect(bulkEnqueue).toHaveBeenCalledTimes(1);
            expect(bulkEnqueue).toHaveBeenCalledWith('processContract', expectedJobs);
        });
    });
});
