'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('orbit_chain_configs', 'gatewayRouter', {
        type: Sequelize.STRING(42),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orbit_chain_configs', 'erc20Gateway', {
        type: Sequelize.STRING(42),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orbit_chain_configs', 'wethGateway', {
        type: Sequelize.STRING(42),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orbit_chain_configs', 'customGateway', {
        type: Sequelize.STRING(42),
        allowNull: true
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('orbit_chain_configs', 'gatewayRouter', { transaction });
      await queryInterface.removeColumn('orbit_chain_configs', 'erc20Gateway', { transaction });
      await queryInterface.removeColumn('orbit_chain_configs', 'wethGateway', { transaction });
      await queryInterface.removeColumn('orbit_chain_configs', 'customGateway', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
