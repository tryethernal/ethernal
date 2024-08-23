'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE contract_verifications ALTER COLUMN libraries SET DEFAULT '{}';
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE contract_verifications ALTER COLUMN libraries DROP DEFAULT;
    `);
  }
};
