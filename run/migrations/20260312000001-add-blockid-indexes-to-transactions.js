'use strict';

/**
 * @fileoverview Migration to add compound index on transactions (blockId, state).
 * Addresses slow queries in Block.revertIfPartial() causing 4000ms+ query times (Sentry #648).
 *
 * The compound index covers both query patterns:
 * - WHERE blockId = X AND state = 'syncing' (revertIfPartial)
 * - WHERE blockId = X (increaseStripeBillingQuota) via leftmost prefix
 *
 * Uses CREATE INDEX CONCURRENTLY to avoid blocking writes during index creation.
 * The transactions table (139M+ rows) is NOT a TimescaleDB hypertable, so CONCURRENTLY is safe.
 * On CCX53 (32 cores, 128GB, NVMe) this should take 2-5 minutes without blocking writes.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_blockid_state ON transactions ("blockId", "state")'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_blockid_state'
    );
  }
};

// CONCURRENTLY operations cannot run inside a database transaction
module.exports.config = { transaction: false };