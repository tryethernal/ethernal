'use strict';

/**
 * @fileoverview Migration to add compound index on transactions (blockId, state).
 * Addresses slow queries in Block.revertIfPartial() causing 4000ms+ query times (Sentry #648).
 *
 * The compound index covers both query patterns:
 * - WHERE blockId = X AND state = 'syncing' (revertIfPartial)
 * - WHERE blockId = X (increaseStripeBillingQuota) via leftmost prefix
 *
 * Uses regular CREATE INDEX (not CONCURRENTLY) because transactions is a
 * TimescaleDB hypertable — CONCURRENTLY is not supported on hypertables.
 * On CCX53 (32 cores, 128GB, NVMe) this should take 2-5 minutes.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_transactions_blockid_state ON transactions ("blockId", "state")'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_transactions_blockid_state'
    );
  }
};