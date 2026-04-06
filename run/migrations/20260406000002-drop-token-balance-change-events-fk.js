'use strict';

/**
 * Drop the foreign key constraint on token_balance_change_events.tokenBalanceChangeId.
 *
 * Same root cause as the token_transfer_events FK deadlock (PR #1064):
 * TimescaleDB acquires ShareRowExclusiveLock on the parent table (token_balance_changes)
 * when creating FK constraints on new hypertable chunks. Two concurrent inserts
 * hitting different new chunks deadlock each other.
 *
 * Safe to drop because token_balance_change_events is a denormalized analytics
 * hypertable, and tokenBalanceChangeId is always set from a just-created
 * TokenBalanceChange within the same application code path.
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'ALTER TABLE token_balance_change_events DROP CONSTRAINT IF EXISTS "token_balance_change_events_tokenBalanceChangeId_fkey"'
        );
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE token_balance_change_events
            ADD CONSTRAINT "token_balance_change_events_tokenBalanceChangeId_fkey"
            FOREIGN KEY ("tokenBalanceChangeId") REFERENCES "token_balance_changes" ("id") DEFERRABLE INITIALLY IMMEDIATE
        `);
    }
};
