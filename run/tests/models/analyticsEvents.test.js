/**
 * @fileoverview Tests for the instance-level destroy of the analytics event models.
 *
 * `timestamp` is the only Sequelize primary key of these models, so the default destroy
 * used to emit `DELETE ... WHERE "timestamp" = X` and wiped the events of every workspace
 * sharing that second. The generated SQL is captured with an unconnected Sequelize instance.
 */

jest.mock('../../lib/pusher');

const { Sequelize, DataTypes } = require('sequelize');

const cases = [
    { name: 'BlockEvent', file: 'blockevent', table: 'block_events', parentKey: 'blockId' },
    { name: 'TransactionEvent', file: 'transactionevent', table: 'transaction_events', parentKey: 'transactionId' },
    { name: 'TokenTransferEvent', file: 'tokentransferevent', table: 'token_transfer_events', parentKey: 'tokenTransferId' },
    { name: 'TokenBalanceChangeEvent', file: 'tokenbalancechangeevent', table: 'token_balance_change_events', parentKey: 'tokenBalanceChangeId' }
];

describe.each(cases)('$name#destroy', ({ file, table, parentKey }) => {
    let sequelize, Model, query;

    beforeEach(() => {
        sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
        Model = require(`../../models/${file}`)(sequelize, DataTypes);
        query = jest.spyOn(sequelize, 'query').mockResolvedValue(1);
    });

    it('Should scope the delete to the workspace, the parent row and the timestamp', async () => {
        const event = Model.build({ workspaceId: 5, [parentKey]: 9, timestamp: 1700000000 }, { isNewRecord: false });

        await event.destroy();

        expect(query).toHaveBeenCalledTimes(1);
        const [sql] = query.mock.calls[0];
        expect(sql).toContain(`DELETE FROM "${table}"`);
        expect(sql).toContain('"workspaceId" = 5');
        expect(sql).toContain(`"${parentKey}" = 9`);
        expect(sql).toContain('"timestamp" =');
    });

    it('Should run inside the given transaction', async () => {
        const transaction = { id: 'fake-transaction' };
        const event = Model.build({ workspaceId: 5, [parentKey]: 9, timestamp: 1700000000 }, { isNewRecord: false });

        await event.destroy({ transaction });

        expect(query.mock.calls[0][1].transaction).toEqual(transaction);
    });

    it('Should refuse to delete on the timestamp alone', async () => {
        const event = Model.build({ timestamp: 1700000000 }, { isNewRecord: false });

        await expect(event.destroy()).rejects.toThrow();
        expect(query).not.toHaveBeenCalled();
    });
});
