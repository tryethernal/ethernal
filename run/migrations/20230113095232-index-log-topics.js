'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        CREATE INDEX transaction_logs_topics_idx
        ON transaction_logs
        USING GIN (topics);
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
        DROP INDEX transaction_logs_topics_idx;
    `);
  }
};
