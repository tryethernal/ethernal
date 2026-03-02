'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orbit_batch_node_maps', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      workspaceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      batchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orbit_batches', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      nodeNum: { type: Sequelize.BIGINT, allowNull: true },
      coverageStatus: { type: Sequelize.ENUM('pending','executed','finalized'), allowNull: false, defaultValue: 'pending' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('orbit_batch_node_maps', ['workspaceId', 'batchId'], { unique: true, name: 'orbit_batch_node_maps_ws_batch_unique' });
    await queryInterface.addIndex('orbit_batch_node_maps', ['nodeNum'], { name: 'orbit_batch_node_maps_node_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_batch_node_maps');
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS \"enum_orbit_batch_node_maps_coverageStatus\";");
  }
};