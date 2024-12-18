'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers DROP CONSTRAINT "token_transfers_transactionId_fkey";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE token_transfers
          ADD CONSTRAINT "token_transfers_transactionId_fkey"
          FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") DEFERRABLE INITIALLY IMMEDIATE;
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
