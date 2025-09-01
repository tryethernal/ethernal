'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable('orbit_deposits', {
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
        l1Block: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        l1TransactionHash: {
          type: Sequelize.STRING(66),
          allowNull: false
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
        messageIndex: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        sender: {
          type: Sequelize.STRING(42),
          allowNull: false
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'confirmed',   'failed'),
          allowNull: false,
          defaultValue: 'pending'
        },
      }, { transaction });

      await queryInterface.addIndex('orbit_deposits', ['workspaceId', 'messageIndex'], {
        unique: true,
        using: 'BTREE',
        name: 'orbit_deposits_workspace_id_message_index_unique',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_deposits');
  }
};
