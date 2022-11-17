'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_logs', 'data', {
        type: Sequelize.TEXT
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_logs', 'data', {
        type: Sequelize.STRING
    });
  }
};
