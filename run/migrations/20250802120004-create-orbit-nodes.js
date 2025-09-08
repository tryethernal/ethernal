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
      createdTxHash: { type: Sequelize.STRING(66), allowNull: true },
      createdBlockNumber: { type: Sequelize.BIGINT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('orbit_nodes', ['workspaceId', 'nodeNum'], { unique: true, name: 'orbit_nodes_ws_node_unique' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_nodes');
  }
};