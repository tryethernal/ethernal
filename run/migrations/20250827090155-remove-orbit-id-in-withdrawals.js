'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('orbit_withdrawals', 'orbiChainConfigId', { transaction });
      
      await queryInterface.addColumn('orbit_withdrawals', 'workspaceId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workspaces',
          key: 'id'
        },
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
      await queryInterface.removeColumn('orbit_withdrawals', 'workspaceId', { transaction });
      await queryInterface.addColumn('orbit_withdrawals', 'orbiCthainConfigId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orbit_chain_configs',
          key: 'id'
        }
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
