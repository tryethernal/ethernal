'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('orbit_batch_node_maps', { transaction });
      await queryInterface.addColumn('orbit_batches', 'orbitNodeId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orbit_nodes',
          key: 'id'
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
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
      }, { transaction });
      await queryInterface.removeColumn('orbit_batches', 'orbitNodeId', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
