'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('op_deposits', {
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
        l2TransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: true
        },
        l2TransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id'
          }
        },
        from: {
          type: Sequelize.STRING(42),
          allowNull: false
        },
        to: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        value: {
          type: Sequelize.STRING(78),
          allowNull: true
        },
        gasLimit: {
          type: Sequelize.STRING(78),
          allowNull: true
        },
        data: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        isCreation: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'confirmed', 'failed'),
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

      await queryInterface.addIndex('op_deposits', ['workspaceId', 'l1TransactionHash'], {
        unique: true,
        using: 'BTREE',
        name: 'op_deposits_workspace_id_l1_tx_hash_unique',
        transaction
      });

      await queryInterface.addIndex('op_deposits', ['workspaceId', 'l2TransactionHash'], {
        using: 'BTREE',
        name: 'op_deposits_workspace_id_l2_tx_hash',
        transaction
      });

      await queryInterface.addIndex('op_deposits', ['workspaceId', 'status'], {
        using: 'BTREE',
        name: 'op_deposits_workspace_id_status',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('op_deposits');
  }
};
