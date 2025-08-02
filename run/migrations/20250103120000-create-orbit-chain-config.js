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
        onDelete: 'CASCADE',
        unique: true
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
        type: Sequelize.STRING(42),
        allowNull: true
      },
      validatorWalletCreatorContract: {
        type: Sequelize.STRING(42),
        allowNull: true
      },
      parentChainId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      confirmationPeriodBlocks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      stakeToken: {
        type: Sequelize.STRING(42),
        allowNull: true
      },
      baseStake: {
        type: Sequelize.STRING(78),
        allowNull: true
      },
      chainType: {
        type: Sequelize.ENUM('ROLLUP', 'ANYTRUST'),
        allowNull: false,
        defaultValue: 'ROLLUP'
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

    await queryInterface.addIndex('orbit_chain_configs', ['workspaceId'], {
      unique: true,
      name: 'orbit_chain_configs_workspace_id_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_chain_configs');
  }
};