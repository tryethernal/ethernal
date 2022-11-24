'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_receipts', 'byzantium', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        default: false
    });
  },

  async down (queryInterface, Sequelize) {
   
  }
};
