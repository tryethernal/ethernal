'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add 'ETHEREUM' to the existing ENUM type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_orbit_chain_configs_parentChainType" ADD VALUE 'ETHEREUM';
    `);

    // Set the default value to 'ETHEREUM'
    await queryInterface.sequelize.query(`
      ALTER TABLE "orbit_chain_configs" 
      ALTER COLUMN "parentChainType" SET DEFAULT 'ETHEREUM';
    `);
  },

  async down(queryInterface) {
    // Revert the default value back to null
    await queryInterface.sequelize.query(`
      ALTER TABLE "orbit_chain_configs" 
      ALTER COLUMN "parentChainType" SET DEFAULT NULL;
    `);

    // Update records that have 'ETHEREUM' to null
    await queryInterface.sequelize.query(`
      UPDATE "orbit_chain_configs" 
      SET "parentChainType" = NULL 
      WHERE "parentChainType" = 'ETHEREUM';
    `);

    // Note: PostgreSQL doesn't support removing ENUM values directly
    // The 'ETHEREUM' value will remain in the ENUM type but won't be used
  }
};
