'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('orbit_nodes', 'confirmed', { transaction });
      await queryInterface.removeColumn('orbit_nodes', 'rejected', { transaction });
      await queryInterface.addColumn('orbit_nodes', 'status', {
        type: Sequelize.ENUM('pending', 'confirmed', 'rejected'),
        allowNull: true,
        defaultValue: 'pending'
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
      await queryInterface.removeColumn('orbit_nodes', 'status', { transaction });
      await queryInterface.addColumn('orbit_nodes', 'confirmed', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, { transaction });
      await queryInterface.addColumn('orbit_nodes', 'rejected', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
