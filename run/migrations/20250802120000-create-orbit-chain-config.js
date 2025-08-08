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
        references: {
          model: 'workspaces',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true
      },
      
      // Parent Chain Configuration
      parentChainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Chain ID of the parent chain (L1 for L2 Orbit, L1/L2 for L3 Orbit)'
      },
      parentChainRpcServer: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'RPC endpoint for the parent chain where infrastructure contracts are deployed'
      },
      
      // Infrastructure Contracts (deployed on parent chain)
      rollupContract: {
        type: Sequelize.STRING(42),
        allowNull: false,
        comment: 'Rollup contract address on parent chain'
      },
      bridgeContract: {
        type: Sequelize.STRING(42),
        allowNull: false,
        comment: 'Bridge contract address on parent chain'
      },
      inboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false,
        comment: 'Inbox contract address on parent chain'
      },
      sequencerInboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false,
        comment: 'Sequencer Inbox contract address on parent chain'
      },
      outboxContract: {
        type: Sequelize.STRING(42),
        allowNull: false,
        comment: 'Outbox contract address on parent chain'
      },
      challengeManagerContract: {
        type: Sequelize.STRING(42),
        allowNull: true,
        comment: 'Challenge Manager contract address on parent chain'
      },
      validatorWalletCreatorContract: {
        type: Sequelize.STRING(42),
        allowNull: true,
        comment: 'Validator Wallet Creator contract address on parent chain'
      },
      
      // Chain Configuration
      confirmationPeriodBlocks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 45818,
        comment: 'Number of blocks for challenge period on parent chain'
      },
      chainType: {
        type: Sequelize.ENUM('ROLLUP', 'ANYTRUST'),
        allowNull: false,
        defaultValue: 'ROLLUP',
        comment: 'Type of Arbitrum Orbit chain'
      },
      
      // Optional Staking Configuration  
      stakeToken: {
        type: Sequelize.STRING(42),
        allowNull: true,
        comment: 'Stake token address on parent chain (if custom token used)'
      },
      baseStake: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Base stake amount required for validators'
      },
      
      // Metadata
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
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