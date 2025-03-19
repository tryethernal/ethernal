'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
          'CREATE INDEX idx_transaction_trace_steps_workspace_address ON transaction_trace_steps("workspaceId", address, id);',
          { transaction }
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX idx_transaction_trace_steps_transaction_depth ON transaction_trace_steps("transactionId", depth, id);',
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        'DROP INDEX idx_transaction_trace_steps_workspace_address;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX idx_transaction_trace_steps_transaction_depth;',
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

