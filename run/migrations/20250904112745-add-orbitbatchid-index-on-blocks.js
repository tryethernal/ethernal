'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_orbit_batch_id_idx ON blocks ("orbitBatchId", id);
    `);
  },

  async down (queryInterface, Sequelize) {
    queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS blocks_orbit_batch_id_idx;
    `);
  }
};
