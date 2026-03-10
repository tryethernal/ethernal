'use strict';

/**
 * @fileoverview Migration to add compound index on (workspaceId, blockNumber) to transactions table.
 * This optimizes the common query pattern in getFilteredTransactions which filters by workspaceId
 * and orders by blockNumber. The existing transactions_blockNumber_workspaceId_idx has the columns
 * in reverse order which is not optimal for this query pattern.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_workspace_blocknumber ON transactions ("workspaceId", "blockNumber")'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_workspace_blocknumber'
    );
  }
};

// CONCURRENTLY cannot run inside a transaction
module.exports.config = { transaction: false };
