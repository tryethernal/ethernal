'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn('transactions', 'maxFeePerGas', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'maxPriorityFeePerGas', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'gas', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'accessList', {
        type: Sequelize.JSON,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'yParity', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'blobVersionedHashes', {
        type: Sequelize.JSON,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transactions', 'maxFeePerBlobGas', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transaction_receipts', 'blobGasUsed', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transaction_receipts', 'blobGasPrice', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transaction_receipts', 'timeboosted', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transaction_receipts', 'gasUsedForL1', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('transaction_receipts', 'effectiveGasPrice', {
        type: Sequelize.STRING,
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
      await queryInterface.removeColumn('transactions', 'maxFeePerGas', { transaction });
      await queryInterface.removeColumn('transactions', 'maxPriorityFeePerGas', { transaction });
      await queryInterface.removeColumn('transactions', 'gas', { transaction });
      await queryInterface.removeColumn('transactions', 'accessList', { transaction });
      await queryInterface.removeColumn('transactions', 'yParity', { transaction });
      await queryInterface.removeColumn('transactions', 'blobVersionedHashes', { transaction });
      await queryInterface.removeColumn('transactions', 'maxFeePerBlobGas', { transaction });
      await queryInterface.removeColumn('transaction_receipts', 'blobGasUsed', { transaction });
      await queryInterface.removeColumn('transaction_receipts', 'blobGasPrice', { transaction });
      await queryInterface.removeColumn('transaction_receipts', 'timeboosted', { transaction });
      await queryInterface.removeColumn('transaction_receipts', 'gasUsedForL1', { transaction });
      await queryInterface.removeColumn('transaction_receipts', 'effectiveGasPrice', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
