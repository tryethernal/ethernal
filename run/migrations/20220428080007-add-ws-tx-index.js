'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex(
          'transactions',
          {
              fields: ['workspaceId', 'hash'],
              name: 'transactions_workspaceId_hash_idx',
          }
      );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        DROP INDEX "transactions_workspaceId_hash_idx"
    `);
  }
};
