'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE explorer_domains
      ADD CONSTRAINT explorer_domains_unique_domain
      UNIQUE (domain);
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE explorer_domains
      DROP CONSTRAINT IF EXISTS explorer_domains_unique_domain;
    `);
  }
};
