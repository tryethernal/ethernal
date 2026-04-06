'use strict';

/**
 * Drop the foreign key constraint on transaction_events.transactionId.
 *
 * Same root cause as the token_transfer_events FK deadlock (PR #1064):
 * TimescaleDB acquires ShareRowExclusiveLock on the parent table (transactions)
 * when creating FK constraints on new hypertable chunks. Two concurrent inserts
 * hitting different new chunks deadlock each other.
 *
 * Safe to drop because transaction_events is a denormalized analytics hypertable,
 * and transactionId is always set from a just-created Transaction within the
 * same application code path.
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'ALTER TABLE transaction_events DROP CONSTRAINT IF EXISTS "transaction_events_transactionId_fkey"'
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE transaction_events
            ADD CONSTRAINT "transaction_events_transactionId_fkey"
            FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") DEFERRABLE INITIALLY IMMEDIATE
        `);
    }
};
