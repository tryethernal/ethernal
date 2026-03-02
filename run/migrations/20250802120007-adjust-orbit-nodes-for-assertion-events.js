'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'orbit_nodes';

      await queryInterface.addColumn(table, 'parentNodeHash', { type: Sequelize.STRING(66), allowNull: true });
      await queryInterface.addColumn(table, 'nodeHash', { type: Sequelize.STRING(66), allowNull: true });
      await queryInterface.addColumn(table, 'afterInboxBatchAcc', { type: Sequelize.STRING(66), allowNull: true });
      await queryInterface.addColumn(table, 'wasmModuleRoot', { type: Sequelize.STRING(66), allowNull: true });
      await queryInterface.addColumn(table, 'inboxMaxCount', { type: Sequelize.BIGINT, allowNull: true });
      await queryInterface.addColumn(table, 'confirmedBlockHash', { type: Sequelize.STRING(66), allowNull: true });
      await queryInterface.addColumn(table, 'confirmedSendRoot', { type: Sequelize.STRING(66), allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    const table = 'orbit_nodes';
    // Remove new columns
    const drops = [
      'parentNodeHash','nodeHash','afterInboxBatchAcc','wasmModuleRoot','inboxMaxCount','confirmedBlockHash','confirmedSendRoot'
    ];
    for (const col of drops) {
      try { await queryInterface.removeColumn(table, col); } catch (_) {}
    }
  }
};