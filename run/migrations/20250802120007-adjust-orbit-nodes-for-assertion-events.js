'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'orbit_nodes';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    // Add new columns if missing
    if (!desc.parentNodeHash) {
      await queryInterface.addColumn(table, 'parentNodeHash', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.nodeHash) {
      await queryInterface.addColumn(table, 'nodeHash', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.executionHash) {
      await queryInterface.addColumn(table, 'executionHash', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.afterInboxBatchAcc) {
      await queryInterface.addColumn(table, 'afterInboxBatchAcc', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.wasmModuleRoot) {
      await queryInterface.addColumn(table, 'wasmModuleRoot', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.inboxMaxCount) {
      await queryInterface.addColumn(table, 'inboxMaxCount', { type: Sequelize.BIGINT, allowNull: true });
    }
    if (!desc.lastIncludedBatchSequenceNumber) {
      await queryInterface.addColumn(table, 'lastIncludedBatchSequenceNumber', { type: Sequelize.BIGINT, allowNull: true });
    }
    if (!desc.confirmedBlockHash) {
      await queryInterface.addColumn(table, 'confirmedBlockHash', { type: Sequelize.STRING(66), allowNull: true });
    }
    if (!desc.confirmedSendRoot) {
      await queryInterface.addColumn(table, 'confirmedSendRoot', { type: Sequelize.STRING(66), allowNull: true });
    }

    // Remove obsolete columns if present
    if (desc.seqNumStart) {
      await queryInterface.removeColumn(table, 'seqNumStart');
    }
    if (desc.seqNumEnd) {
      try { await queryInterface.removeIndex(table, 'orbit_nodes_seq_end_idx'); } catch (_) {}
      await queryInterface.removeColumn(table, 'seqNumEnd');
    }
    if (desc.parentNodeNum) {
      await queryInterface.removeColumn(table, 'parentNodeNum');
    }
    if (desc.createdBlockNumber) {
      await queryInterface.removeColumn(table, 'createdBlockNumber');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'orbit_nodes';
    // Remove new columns
    const drops = [
      'parentNodeHash','nodeHash','executionHash','afterInboxBatchAcc','wasmModuleRoot','inboxMaxCount','lastIncludedBatchSequenceNumber','confirmedBlockHash','confirmedSendRoot'
    ];
    for (const col of drops) {
      try { await queryInterface.removeColumn(table, col); } catch (_) {}
    }
    // Recreate removed columns (nullable)
    try { await queryInterface.addColumn(table, 'seqNumStart', { type: Sequelize.BIGINT, allowNull: true }); } catch (_) {}
    try { await queryInterface.addColumn(table, 'seqNumEnd', { type: Sequelize.BIGINT, allowNull: true }); } catch (_) {}
    try { await queryInterface.addColumn(table, 'parentNodeNum', { type: Sequelize.BIGINT, allowNull: true }); } catch (_) {}
    try { await queryInterface.addColumn(table, 'createdBlockNumber', { type: Sequelize.BIGINT, allowNull: true }); } catch (_) {}
  }
};