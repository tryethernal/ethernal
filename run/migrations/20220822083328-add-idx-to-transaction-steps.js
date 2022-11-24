'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex(
          'transaction_trace_steps',
          {
              fields: ['transactionId', 'workspaceId'],
              name: 'transaction_trace_steps_transactionId_workspaceId_idx',
          }
      );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        DROP INDEX "transaction_trace_steps_transactionId_workspaceId_idx"
    `);
  }
};
