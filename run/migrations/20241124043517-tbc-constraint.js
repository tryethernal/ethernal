'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addConstraint('token_balance_changes', {
        type: 'unique',
        fields: ['transactionId', 'token', 'address'],
        name: 'token_balance_changes_txid_token_address_unique'
    });
  },

  async down (queryInterface) {
    await queryInterface.removeConstraint('token_balance_changes', 'token_balance_changes_txid_token_address_unique');
  }
};
