'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn('orbit_withdrawals', 'l1TokenAddress', {
        type: Sequelize.STRING(42),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'tokenSymbol', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'tokenDecimals', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'timestamp', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'from', {
        type: Sequelize.STRING(42),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'l1TransactionHash', {
        type: Sequelize.STRING(66),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('orbit_withdrawals', 'l2TransactionHash', {
        type: Sequelize.STRING(66),
        allowNull: true,
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
      await queryInterface.removeColumn('orbit_withdrawals', 'l1TokenAddress', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'tokenSymbol', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'tokenDecimals', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'l1TransactionHash', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'l2TransactionHash', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'timestamp', { transaction });
      await queryInterface.removeColumn('orbit_withdrawals', 'from', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
