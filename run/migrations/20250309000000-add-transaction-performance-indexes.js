/**
 * @fileoverview Add database indexes to optimize removeStalledBlock performance.
 * Adds indexes on transactions.blockId and transactions.state to improve query performance
 * for block cleanup operations.
 * @module migrations/add-transaction-performance-indexes
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add composite index on (blockId, state) for optimal removeStalledBlock performance
      // This single index handles both queries:
      // 1. COUNT WHERE blockId=? AND state='syncing'
      // 2. COUNT WHERE blockId=? (via leftmost prefix matching)
      await queryInterface.addIndex(
        'transactions',
        {
          fields: ['blockId', 'state'],
          name: 'transactions_blockId_state_idx',
          transaction
        }
      );

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('transactions', 'transactions_blockId_state_idx', { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }
};