/**
 * @fileoverview Adds composite indexes for hot-path query optimization.
 * Note: Cannot use CONCURRENTLY inside Sequelize migration transactions.
 * These indexes are safe to create with regular CREATE INDEX but will briefly
 * lock writes on large tables. Run during low-traffic periods.
 * @module migrations/20260304000001-add-performance-indexes
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // transaction_logs: composite (workspaceId, address) for contract log queries + V2 DEX pool reserve setup
        // Separate workspaceId and address indexes exist but no composite
        await queryInterface.addIndex('transaction_logs', ['workspaceId', 'address'], {
            name: 'idx_transaction_logs_workspace_address'
        });

        // token_transfers: composite (workspaceId, token) for token transfer queries
        // Only (workspaceId) index exists currently
        await queryInterface.addIndex('token_transfers', ['workspaceId', 'token'], {
            name: 'idx_token_transfers_workspace_token'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('transaction_logs', 'idx_transaction_logs_workspace_address');
        await queryInterface.removeIndex('token_transfers', 'idx_token_transfers_workspace_token');
    }
};
