/**
 * @fileoverview Adds composite indexes for hot-path query optimization.
 * Uses raw SQL with CREATE INDEX CONCURRENTLY to avoid blocking writes.
 * CONCURRENTLY cannot run inside a transaction, so we disable the migration transaction.
 * Each index is created with IF NOT EXISTS to be safely re-runnable.
 * @module migrations/20260304000001-add-performance-indexes
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_logs_workspace_address ON transaction_logs ("workspaceId", address)'
        );

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

module.exports.config = { transaction: false };
