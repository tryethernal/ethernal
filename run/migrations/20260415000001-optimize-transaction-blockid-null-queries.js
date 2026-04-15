/**
 * @fileoverview Add optimized index for transaction queries with NULL blockId.
 * This fixes slow queries that look for transactions without a blockId while
 * maintaining proper workspace isolation.
 */
'use strict';

module.exports = {
    async up(queryInterface) {
        // Create partial index optimized for "blockId IS NULL" queries with workspace filter
        // This targets the specific slow query pattern identified in Sentry issue #1140
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_workspace_blockid_null ' +
            'ON transactions (workspaceId) ' +
            'WHERE blockId IS NULL'
        );
    },

    async down(queryInterface) {
        // Drop the index if rolling back
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_workspace_blockid_null'
        );
    }
};

// CONCURRENTLY operations cannot run inside transactions
module.exports.config = { transaction: false };