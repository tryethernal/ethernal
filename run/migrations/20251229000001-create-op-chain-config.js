'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('op_chain_configs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: {
            model: 'workspaces',
            key: 'id'
          }
        },
        parentWorkspaceId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'workspaces',
            key: 'id'
          }
        },
        parentChainId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        batchInboxAddress: {
          type: Sequelize.STRING(42),
          allowNull: false
        },
        optimismPortalAddress: {
          type: Sequelize.STRING(42),
          allowNull: false
        },
        l2OutputOracleAddress: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        disputeGameFactoryAddress: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        systemConfigAddress: {
          type: Sequelize.STRING(42),
          allowNull: true
        },
        l2ToL1MessagePasserAddress: {
          type: Sequelize.STRING(42),
          allowNull: false,
          defaultValue: '0x4200000000000000000000000000000000000016'
        },
        outputVersion: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        submissionInterval: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        finalizationPeriodSeconds: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 604800
        },
        parentChainExplorer: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'https://etherscan.io'
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

      await queryInterface.addIndex('op_chain_configs', ['parentWorkspaceId'], {
        using: 'BTREE',
        name: 'op_chain_configs_parent_workspace_id',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('op_chain_configs');
  }
};
