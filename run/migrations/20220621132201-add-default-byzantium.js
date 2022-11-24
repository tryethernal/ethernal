'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_receipts', 'byzantium', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    });
  },

  async down (queryInterface, Sequelize) {
   
  }
};
