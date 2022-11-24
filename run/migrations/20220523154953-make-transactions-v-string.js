'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transactions', 'v', {
        type: Sequelize.STRING,
        allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
   
  }
};
