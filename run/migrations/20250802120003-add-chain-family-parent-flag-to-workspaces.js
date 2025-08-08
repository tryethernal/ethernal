'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'workspaces';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!desc.isParentChain) {
      await queryInterface.addColumn(table, 'isParentChain', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!desc.chainFamily) {
      await queryInterface.addColumn(table, 'chainFamily', {
        type: Sequelize.ENUM('ARBITRUM', 'ETHEREUM', 'BSC', 'POLYGON', 'OPTIMISM', 'OTHER'),
        allowNull: false,
        defaultValue: 'ARBITRUM'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'workspaces';
    try { await queryInterface.removeColumn(table, 'chainFamily'); } catch (_) {}
    try {
      await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_workspaces_chainFamily\";");
    } catch (_) {}
    try { await queryInterface.removeColumn(table, 'isParentChain'); } catch (_) {}
  }
};