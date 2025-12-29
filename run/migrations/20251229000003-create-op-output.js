'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('op_outputs', {
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
          }
        },
        outputIndex: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        outputRoot: {
          type: Sequelize.STRING(66),
          allowNull: false
        },
        l2BlockNumber: {
          type: Sequelize.INTEGER,
          allowNull: false
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
          }
        },
        proposer: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false
        },
        challengePeriodEnds: {
          type: Sequelize.DATE,
          allowNull: true
        },
        disputeGameAddress: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        gameType: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('proposed', 'challenged', 'resolved', 'finalized'),
          allowNull: false,
          defaultValue: 'proposed'
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

      await queryInterface.addIndex('op_outputs', ['workspaceId', 'outputIndex'], {
        unique: true,
        using: 'BTREE',
        name: 'op_outputs_workspace_id_output_index_unique',
        transaction
      });

      await queryInterface.addIndex('op_outputs', ['workspaceId', 'l2BlockNumber'], {
        using: 'BTREE',
        name: 'op_outputs_workspace_id_l2_block_number',
        transaction
      });

      await queryInterface.addIndex('op_outputs', ['workspaceId', 'status'], {
        using: 'BTREE',
        name: 'op_outputs_workspace_id_status',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('op_outputs');
  }
};
