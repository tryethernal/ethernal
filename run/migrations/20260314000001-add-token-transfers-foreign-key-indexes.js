/**
 * @fileoverview Adds missing foreign key index on token_transfers.transactionId.
 * Fixes slow JOIN queries in processTokenTransfer job causing 1+ second query times.
 *
 * The token_transfers table was missing an index on transactionId, causing slow
 * LEFT OUTER JOINs with the transactions table in TokenTransfer.findByPk().
 *
 * This became a performance issue after commit #666 restored ERC-20 processing,
 * dramatically increasing the volume of processTokenTransfer jobs.
 *
 * @module migrations/20260314000001-add-token-transfers-foreign-key-indexes
 */

'use strict';

module.exports = {
    async up(queryInterface) {
        // Add missing foreign key index on transactionId
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transfers_transaction_id ON token_transfers ("transactionId")'
        );

        // Add standalone workspaceId index for efficient workspace filtering
        // (complements existing composite index on workspaceId, token)
        await queryInterface.sequelize.query(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_transfers_workspace_id ON token_transfers ("workspaceId")'
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_token_transfers_transaction_id'
        );
        await queryInterface.sequelize.query(
            'DROP INDEX CONCURRENTLY IF EXISTS idx_token_transfers_workspace_id'
        );
    }
};

module.exports.config = { transaction: false };