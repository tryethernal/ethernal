'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_trace_steps', 'input', {
        type: Sequelize.TEXT
    });
    await queryInterface.changeColumn('transaction_trace_steps', 'returnData', {
        type: Sequelize.TEXT
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_trace_steps', 'input', {
        type: Sequelize.STRING
    });
    await queryInterface.changeColumn('transaction_trace_steps', 'returnData', {
        type: Sequelize.STRING
    });
  }
};
