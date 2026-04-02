'use strict';

/**
 * Drop the foreign key constraint on token_transfer_events.tokenTransferId.
 *
 * This FK causes deadlocks under high-concurrency inserts because TimescaleDB
 * acquires ShareRowExclusiveLock on the parent table (token_transfers) when
 * creating FK constraints on new hypertable chunks. Two concurrent inserts
 * hitting different new chunks deadlock each other.
 *
 * The FK is safe to drop because token_transfer_events is a denormalized
 * analytics hypertable, and tokenTransferId is always set from a
 * just-created TokenTransfer within the same application transaction.
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'ALTER TABLE token_transfer_events DROP CONSTRAINT IF EXISTS "token_transfer_events_tokenTransferId_fkey"'
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE token_transfer_events
            ADD CONSTRAINT "token_transfer_events_tokenTransferId_fkey"
            FOREIGN KEY ("tokenTransferId") REFERENCES "token_transfers" ("id") DEFERRABLE INITIALLY IMMEDIATE
        `);
    }
};
