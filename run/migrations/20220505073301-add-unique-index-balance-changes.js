'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_balance_changes
        ADD CONSTRAINT unique_transactionId_token_address_token_balance_changes
        UNIQUE ("transactionId", "token", "address");
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_balance_changes
        DROP CONSTRAINT unique_transactionId_token_address_token_balance_changes
    `);
  }
};
