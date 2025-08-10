'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orbit_nodes', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      workspaceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      nodeNum: { type: Sequelize.BIGINT, allowNull: false },
      parentNodeNum: { type: Sequelize.BIGINT, allowNull: true },
      seqNumStart: { type: Sequelize.BIGINT, allowNull: true },
      seqNumEnd: { type: Sequelize.BIGINT, allowNull: true },
      stateRoot: { type: Sequelize.STRING(66), allowNull: true },
      sendAccumulator: { type: Sequelize.STRING(66), allowNull: true },
      logAccumulator: { type: Sequelize.STRING(66), allowNull: true },
      stakerCount: { type: Sequelize.INTEGER, allowNull: true },
      challengeDeadline: { type: Sequelize.DATE, allowNull: true },
      confirmed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      rejected: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdTxHash: { type: Sequelize.STRING(66), allowNull: true },
      createdBlockNumber: { type: Sequelize.BIGINT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('orbit_nodes', ['workspaceId', 'nodeNum'], { unique: true, name: 'orbit_nodes_ws_node_unique' });
    await queryInterface.addIndex('orbit_nodes', ['confirmed'], { name: 'orbit_nodes_confirmed_idx' });
    await queryInterface.addIndex('orbit_nodes', ['seqNumEnd'], { name: 'orbit_nodes_seq_end_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_nodes');
  }
};