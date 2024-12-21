'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE token_balance_change_events DROP CONSTRAINT "token_balance_change_events_tokenBalanceChangeId_fkey";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE token_balance_change_events
          ADD CONSTRAINT "token_balance_change_events_tokenBalanceChangeId_fkey"
          FOREIGN KEY ("tokenBalanceChangeId") REFERENCES "token_balance_changes" ("id") DEFERRABLE INITIALLY IMMEDIATE;
        `);

        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfer_events DROP CONSTRAINT "token_transfer_events_tokenTransferId_fkey";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfer_events
          ADD CONSTRAINT "token_transfer_events_tokenTransferId_fkey"
          FOREIGN KEY ("tokenTransferId") REFERENCES "token_transfers" ("id") DEFERRABLE INITIALLY IMMEDIATE;
        `);

        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers DROP CONSTRAINT "token_transfers_transactionLogId_fkey";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers
          ADD CONSTRAINT "token_transfers_transactionLogId_fkey"
          FOREIGN KEY ("transactionLogId") REFERENCES "transaction_logs" ("id") DEFERRABLE INITIALLY IMMEDIATE;
        `);

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },
  async down(queryInterface, Sequelize) {
  }
};
