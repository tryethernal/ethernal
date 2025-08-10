'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addIndex('orbit_batches', ['workspaceId', 'afterAcc'], { name: 'orbit_batches_ws_afteracc_idx' });
    } catch (_) {}
  },
  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeIndex('orbit_batches', 'orbit_batches_ws_afteracc_idx'); } catch (_) {}
  }
};