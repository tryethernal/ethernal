'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'orbit_chain_configs';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!desc.parentWorkspaceId) {
      await queryInterface.addColumn(table, 'parentWorkspaceId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'SET NULL'
      });
    }

    if (!desc.parentChainType) {
      await queryInterface.addColumn(table, 'parentChainType', {
        type: Sequelize.ENUM('ARBITRUM'),
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'orbit_chain_configs';
    // Drop enum column first due to type dependency
    try {
      await queryInterface.removeColumn(table, 'parentChainType');
    } catch (_) {}
    try {
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_orbit_chain_configs_parentChainType\";");
    } catch (_) {}

    try {
      await queryInterface.removeColumn(table, 'parentWorkspaceId');
    } catch (_) {}
  }
};