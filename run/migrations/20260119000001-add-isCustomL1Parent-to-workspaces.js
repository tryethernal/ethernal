'use strict';

/**
 * Migration to add isCustomL1Parent flag to workspaces table.
 * This flag marks user-created custom L1 parent workspaces for L2 chains.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'workspaces';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!desc.isCustomL1Parent) {
      await queryInterface.addColumn(table, 'isCustomL1Parent', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'workspaces';
    try {
      await queryInterface.removeColumn(table, 'isCustomL1Parent');
    } catch (_) {}
  }
};
