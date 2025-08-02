'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orbit_transaction_states', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      transactionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      workspaceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workspaces',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      currentState: {
        type: Sequelize.ENUM('SUBMITTED', 'SEQUENCED', 'POSTED', 'CONFIRMED', 'FINALIZED', 'FAILED'),
        allowNull: false
      },
      stateData: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      submittedBlockNumber: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      submittedTxHash: {
        type: Sequelize.STRING(66),
        allowNull: true
      },
      sequencedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sequencedBlockNumber: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      sequencerBatchIndex: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      postedBlockNumber: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      postedTxHash: {
        type: Sequelize.STRING(66),
        allowNull: true
      },
      confirmedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmedBlockNumber: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      confirmationTxHash: {
        type: Sequelize.STRING(66),
        allowNull: true
      },
      finalizedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      finalizedBlockNumber: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      failedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failureReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('orbit_transaction_states', ['transactionId'], {
      unique: true,
      name: 'orbit_transaction_states_transaction_id_unique'
    });

    await queryInterface.addIndex('orbit_transaction_states', ['workspaceId', 'currentState'], {
      name: 'orbit_transaction_states_workspace_state_index'
    });

    await queryInterface.addIndex('orbit_transaction_states', ['currentState'], {
      name: 'orbit_transaction_states_current_state_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_transaction_states');
  }
};