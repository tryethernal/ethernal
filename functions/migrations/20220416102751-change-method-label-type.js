'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transactions', 'methodLabel', {
        type: Sequelize.TEXT
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transactions', 'methodLabel', {
        type: Sequelize.STRING
    });
  }
};
