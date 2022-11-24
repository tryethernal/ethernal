'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_receipts', 'status', {
        type: Sequelize.BOOLEAN,
        allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
   
  }
};
