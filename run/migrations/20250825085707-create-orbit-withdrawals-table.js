'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('orbit_withdrawals', { 
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        orbiChainConfigId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'orbit_chain_configs',
            key: 'id',
          },
        },
        to: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        amount: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        messageNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        l2TransactionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'transactions',
            key: 'id',
          },
        },
        status: {
          type: Sequelize.ENUM('waiting', 'ready', 'relayed'),
          allowNull: false,
          defaultValue: 'waiting',
        },
        l1TransactionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'transactions',
            key: 'id',
          },
        },
      });
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('orbit_withdrawals');
  }
};
