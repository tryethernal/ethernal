'use strict';

/**
 * @fileoverview Migration to add missing indexes on transactions.blockId for performance optimization.
 * This addresses slow queries in Block.revertIfPartial() method that were causing 4000ms+ query times.
 *
 * Missing indexes:
 * 1. blockId - for queries filtering by blockId (e.g., Transaction.count({ where: { blockId: X } }))
 * 2. (blockId, state) - for queries filtering by blockId and state (e.g., { blockId: X, state: 'syncing' })
 *
 * These queries are performed in Block.revertIfPartial() and were identified in Sentry issue #648
 * as causing significant performance bottlenecks with 1373+ slow query events.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add index on blockId for queries that filter by blockId only
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_blockid ON transactions ("blockId")'
    );

    // Add compound index on (blockId, state) for queries that filter by both
    // This covers the exact pattern in Block.revertIfPartial(): { blockId: X, state: 'syncing' }
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_blockid_state ON transactions ("blockId", "state")'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_blockid_state'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_blockid'
    );
  }
};

// CONCURRENTLY cannot run inside a transaction
module.exports.config = { transaction: false };