'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex(
          'contracts',
          {
              fields: ['workspaceId', 'hashedBytecode'],
              name: 'contracts_workspaceId_hashedBytecode_idx',
          }
      );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        DROP INDEX "contracts_workspaceId_hashedBytecode_idx"
    `);
  }
};
