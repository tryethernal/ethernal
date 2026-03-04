/**
 * @fileoverview Adds composite indexes for hot-path query optimization.
 * Uses CREATE INDEX CONCURRENTLY to avoid locking on large tables.
 * @module migrations/20260304000001-add-performance-indexes
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // transaction_logs: composite (workspaceId, address) for contract log queries + V2 DEX pool reserve setup
        // Separate workspaceId and address indexes exist but no composite
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_logs_workspace_address ON transaction_logs ("workspaceId", address)'
        );

        // token_transfers: composite (workspaceId, token) for token transfer queries
        // Only (workspaceId) index exists currently
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transfers_workspace_token ON token_transfers ("workspaceId", token)'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_transaction_logs_workspace_address'
        );
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_token_transfers_workspace_token'
        );
    }
};
