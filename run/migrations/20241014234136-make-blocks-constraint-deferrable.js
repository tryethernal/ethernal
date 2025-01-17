'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.sequelize.query(`
          ALTER TABLE transactions DROP CONSTRAINT "fk_blocknumber_workspaceid_blocks_number_workspaceid";
        `);
        await queryInterface.sequelize.query(`
          ALTER TABLE transactions
          ADD CONSTRAINT "fk_blocknumber_workspaceid_blocks_number_workspaceid"
          FOREIGN KEY ("blockNumber", "workspaceId") REFERENCES blocks(number, "workspaceId") DEFERRABLE INITIALLY DEFERRED;
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
