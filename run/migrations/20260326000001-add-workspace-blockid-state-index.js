/**
 * @fileoverview Adds compound index on transactions (workspaceId, blockId, state).
 * Fixes slow DB queries in Block.revertIfPartial() causing performance regression (Sentry #889).
 *
 * The queries in revertIfPartial() use WHERE clauses like:
 * - WHERE workspaceId = X AND blockId = Y AND state = 'syncing'
 * - WHERE workspaceId = X AND blockId = Y
 *
 * For TimescaleDB hypertables partitioned by workspaceId, this compound index:
 * 1. Enables partition pruning with workspaceId (first column)
 * 2. Supports both query patterns via leftmost prefix matching
 * 3. Reduces query time from 300-1100ms to milliseconds
 *
 * @module migrations/20260326000001-add-workspace-blockid-state-index
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_workspace_blockid_state ON transactions ("workspaceId", "blockId", "state")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_workspace_blockid_state'
        );
    }
};

module.exports.config = { transaction: false }; // CONCURRENTLY cannot run in transactions