'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('op_withdrawals', {
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
        withdrawalHash: {
          type: Sequelize.STRING(66),
          allowNull: false
        },
        nonce: {
          type: Sequelize.STRING(78),
          allowNull: false
        },
        l2BlockNumber: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        l2TransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: false
        },
        l2TransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id'
          }
        },
        l1ProofTransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: true
        },
        l1ProofTransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id'
          }
        },
        l1FinalizeTransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: true
        },
        l1FinalizeTransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id'
          }
        },
        sender: {
          type: Sequelize.STRING(42),
          allowNull: false
        },
        target: {
          type: Sequelize.STRING(42),
          allowNull: false
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
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('initiated', 'proven', 'finalized'),
          allowNull: false,
          defaultValue: 'initiated'
        },
        provenAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        finalizedAt: {
          type: Sequelize.DATE,
          allowNull: true
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

      await queryInterface.addIndex('op_withdrawals', ['workspaceId', 'withdrawalHash'], {
        unique: true,
        using: 'BTREE',
        name: 'op_withdrawals_workspace_id_withdrawal_hash_unique',
        transaction
      });

      await queryInterface.addIndex('op_withdrawals', ['workspaceId', 'l2TransactionHash'], {
        using: 'BTREE',
        name: 'op_withdrawals_workspace_id_l2_tx_hash',
        transaction
      });

      await queryInterface.addIndex('op_withdrawals', ['workspaceId', 'status'], {
        using: 'BTREE',
        name: 'op_withdrawals_workspace_id_status',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('op_withdrawals');
  }
};
