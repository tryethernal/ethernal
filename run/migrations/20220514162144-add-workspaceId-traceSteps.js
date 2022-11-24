'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('transaction_trace_steps', 'workspaceId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            key: 'id',
            model: {
              tableName: 'workspaces'
            }
        },
    });
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.removeColumn('transactions', 'workspaceId');
  }
};
