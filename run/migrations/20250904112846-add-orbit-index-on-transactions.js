'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_block_id_block_number_idx ON transactions ("blockId", "blockNumber");
    `);
  },

  async down (queryInterface, Sequelize) {
    queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS transactions_block_id_block_number_idx;
    `);
  }
};
