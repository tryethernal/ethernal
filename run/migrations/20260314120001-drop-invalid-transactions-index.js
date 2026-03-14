/**
 * @fileoverview Drops invalid index on transactions table to fix 20+ second UPDATE queries.
 *
 * The invalid index transactions_block_id_block_number_idx was causing severe performance
 * degradation for UPDATE queries on the transactions table during blockSync operations.
 * Invalid indexes interfere with query planning and can cause lock contention issues.
 *
 * This fixes Sentry issue #683 - 20+ second UPDATE queries on transactions.state.
 *
 * @module migrations/20260314120001-drop-invalid-transactions-index
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // Drop the invalid index that was causing performance issues
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS transactions_block_id_block_number_idx'
        );
    },

    async down(queryInterface) {
        // Note: We cannot recreate the invalid index in the down migration
        // as it would immediately become invalid again. The index was likely
        // created during a failed operation and should not be restored.

        // If needed, a proper index could be recreated as:
        // CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_block_id_block_number_idx
        // ON transactions ("blockId", "blockNumber");

        // However, this index appears to be redundant given existing indexes:
        // - "transactions_blockId_fkey" already covers blockId
        // - "transactions_block_id_idx" also covers blockId

        // For safety, we'll leave the down migration empty
    }
};

module.exports.config = { transaction: false }; // CONCURRENTLY cannot run in transactions
