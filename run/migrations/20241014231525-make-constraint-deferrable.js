'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE contracts DROP CONSTRAINT "contracts_transactionId_fkey";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE contracts
          ADD CONSTRAINT "contracts_transactionId_fkey"
          FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") DEFERRABLE INITIALLY DEFERRED;
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
