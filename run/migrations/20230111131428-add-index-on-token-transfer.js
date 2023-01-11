'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE INDEX "token_transfers_transaction_logs_transactionLogId_idx"
      ON token_transfers("transactionLogId");
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX "token_transfers_transaction_logs_transactionLogId_idx";
    `);
  }
};
