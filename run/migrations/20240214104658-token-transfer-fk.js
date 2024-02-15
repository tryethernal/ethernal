'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE token_transfers
        ADD CONSTRAINT "token_transfers_transactionId_fkey"
        FOREIGN KEY ("transactionId")
        REFERENCES transactions(id);
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE token_transfers
        ADD CONSTRAINT "token_transfers_transactionLogId_fkey"
        FOREIGN KEY ("transactionLogId")
        REFERENCES transaction_logs(id);
      `, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE token_transfers
        DROP CONSTRAINT "token_transfers_transactionId_fkey";
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE token_transfers
        DROP CONSTRAINT "token_transfers_transactionLogId_fkey";
      `, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  }
};
