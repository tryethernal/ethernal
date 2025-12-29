'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('op_batches', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'workspaces',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        batchIndex: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        l1BlockNumber: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        l1TransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: false
        },
        l1TransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        l1TransactionIndex: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        epochNumber: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false
        },
        txCount: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        l2BlockStart: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        l2BlockEnd: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        blobHash: {
          type: Sequelize.STRING(66),
          allowNull: true
        },
        blobData: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('pending', 'confirmed', 'finalized'),
          allowNull: false,
          defaultValue: 'pending'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('op_batches', ['workspaceId', 'l1TransactionHash'], {
        unique: true,
        using: 'BTREE',
        name: 'op_batches_workspace_id_l1_tx_hash_unique',
        transaction
      });

      await queryInterface.addIndex('op_batches', ['workspaceId', 'batchIndex'], {
        using: 'BTREE',
        name: 'op_batches_workspace_id_batch_index',
        transaction
      });

      await queryInterface.addIndex('op_batches', ['workspaceId', 'l2BlockStart', 'l2BlockEnd'], {
        using: 'BTREE',
        name: 'op_batches_workspace_id_l2_block_range',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('op_batches');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_op_batches_status";');
  }
};
