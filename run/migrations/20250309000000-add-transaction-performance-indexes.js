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
      // Add index on blockId for faster transaction counts by block
      await queryInterface.addIndex(
        'transactions',
        {
          fields: ['blockId'],
          name: 'transactions_blockId_idx',
          transaction
        }
      );

      // Add index on state for faster filtering by transaction state
      await queryInterface.addIndex(
        'transactions',
        {
          fields: ['state'],
          name: 'transactions_state_idx',
          transaction
        }
      );

      // Add composite index on (blockId, state) for optimal removeStalledBlock performance
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
      await queryInterface.removeIndex('transactions', 'transactions_blockId_idx', { transaction });
      await queryInterface.removeIndex('transactions', 'transactions_state_idx', { transaction });
      await queryInterface.removeIndex('transactions', 'transactions_blockId_state_idx', { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }
};