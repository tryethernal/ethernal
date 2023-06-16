'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('transaction_trace_steps', 'value', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('transaction_trace_steps', 'value');
  }
};
