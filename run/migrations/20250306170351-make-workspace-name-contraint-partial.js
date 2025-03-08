'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing constraint
    await queryInterface.removeConstraint(
      'workspaces', 
      'workspaces_name_userId_is_unique'
    );

    // Create a partial unique index using a raw query
    // Sequelize doesn't directly support partial indexes, so we use a raw query
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "workspaces_name_userId_is_unique" 
      ON "workspaces"("name", "userId")
      WHERE "pendingDeletion" = false;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the partial index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "workspaces_name_userId_is_unique";
    `);

    // Recreate the original constraint
    await queryInterface.addConstraint('workspaces', {
      fields: ['name', 'userId'],
      type: 'unique',
      name: 'workspaces_name_userId_is_unique'
    });
  }
};
