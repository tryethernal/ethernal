'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'orbit_batches';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));
    if (!desc.seqNumStart) {
      await queryInterface.addColumn(table, 'seqNumStart', { type: Sequelize.BIGINT, allowNull: true });
    }
    if (!desc.seqNumEnd) {
      await queryInterface.addColumn(table, 'seqNumEnd', { type: Sequelize.BIGINT, allowNull: true });
    }
    await queryInterface.addIndex(table, ['seqNumEnd'], { name: 'orbit_batches_seq_end_idx' });
  },
  async down(queryInterface, Sequelize) {
    try { await queryInterface.removeColumn('orbit_batches', 'seqNumStart'); } catch (_) {}
    try { await queryInterface.removeColumn('orbit_batches', 'seqNumEnd'); } catch (_) {}
  }
};