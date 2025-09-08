'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
      blocks_orbit_batch_id_idx
      ON blocks ("orbitBatchId", id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
      transactions_block_id_idx
      ON transactions ("blockId");
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS blocks_orbit_batch_id_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS transactions_block_id_idx;
    `);
  }
};
