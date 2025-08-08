'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orbit_chain_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      workspaceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'workspaces', key: 'id' },
        onDelete: 'CASCADE'
      },
      rollupContract: {
        type: Sequelize.STRING(42),
        allowNull: false
      },
      bridgeContract: {
        type: Sequelize.STRING(42),
        allowNull: false
      },
      inboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false
      },
      sequencerInboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false
      },
      outboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false
      },
      challengeManagerContract: {
        type: Sequelize.STRING(42)
      },
      validatorWalletCreatorContract: {
        type: Sequelize.STRING(42)
      },
      parentChainId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      parentChainRpcServer: {
        type: Sequelize.STRING,
        allowNull: false
      },
      confirmationPeriodBlocks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      stakeToken: {
        type: Sequelize.STRING(42)
      },
      baseStake: {
        type: Sequelize.STRING(78)
      },
      chainType: {
        type: Sequelize.ENUM('ROLLUP', 'ANYTRUST'),
        allowNull: false,
        defaultValue: 'ROLLUP'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add new fields for parent workspace linkage and parent chain type
    await queryInterface.addColumn('orbit_chain_configs', 'parentWorkspaceId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'workspaces', key: 'id' },
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('orbit_chain_configs', 'parentChainType', {
      type: Sequelize.ENUM('ARBITRUM', 'ETHEREUM', 'BSC', 'POLYGON', 'OPTIMISM', 'OTHER'),
      allowNull: false,
      defaultValue: 'ARBITRUM'
    });

    // Add indexes for performance
    await queryInterface.addIndex('orbit_chain_configs', ['workspaceId'], {
      unique: true,
      name: 'orbit_chain_configs_workspace_id_unique'
    });
    
    await queryInterface.addIndex('orbit_chain_configs', ['parentChainId'], {
      name: 'orbit_chain_configs_parent_chain_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_chain_configs');
  }
};