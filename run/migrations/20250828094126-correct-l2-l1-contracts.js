'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.renameColumn('orbit_chain_configs',
        'gatewayRouter',
        'l2GatewayRouter',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'erc20Gateway',
        'l2Erc20Gateway',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'wethGateway',
        'l2WethGateway',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'customGateway',
        'l2CustomGateway',
        { transaction });

      await queryInterface.addColumn('orbit_chain_configs',
        'l1GatewayRouter',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction });
      await queryInterface.addColumn('orbit_chain_configs',
        'l1Erc20Gateway',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction });
      await queryInterface.addColumn('orbit_chain_configs',
        'l1WethGateway',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction });
      await queryInterface.addColumn('orbit_chain_configs',
        'l1CustomGateway',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      console.error('Migration failed:', e);
      throw e; // Re-throw to fail the migration
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.renameColumn('orbit_chain_configs',
        'l2GatewayRouter',
        'gatewayRouter',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'l2Erc20Gateway',
        'erc20Gateway',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'l2WethGateway',
        'wethGateway',
        { transaction });

      await queryInterface.renameColumn('orbit_chain_configs',
        'l2CustomGateway',
        'customGateway',
        { transaction });

      await queryInterface.removeColumn('orbit_chain_configs',
        'l1GatewayRouter',
        { transaction });

      await queryInterface.removeColumn('orbit_chain_configs',
        'l1Erc20Gateway',
        { transaction });

      await queryInterface.removeColumn('orbit_chain_configs',
        'l1WethGateway',
        { transaction });

      await queryInterface.removeColumn('orbit_chain_configs',
        'l1CustomGateway',
        { transaction });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      console.error('Migration rollback failed:', e);
      throw e;
    }
  }
};
