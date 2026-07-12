'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tables = ['transaction_events', 'token_transfer_events', 'block_events', 'token_balance_change_events'];
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `SELECT add_retention_policy('${table}', INTERVAL '90 days', if_not_exists => TRUE);`,
          { transaction }
        );
      }
      await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const tables = ['transaction_events', 'token_transfer_events', 'block_events', 'token_balance_change_events'];
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `SELECT remove_retention_policy('${table}', if_exists => TRUE);`,
          { transaction }
        );
      }
      await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
