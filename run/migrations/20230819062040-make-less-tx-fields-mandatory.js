'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('transactions', 'confirmations', { transaction });
      await queryInterface.changeColumn('transactions', 'v', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'transactionHash', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'cumulativeGasUsed', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'gasUsed', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'logsBloom', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transactions', 'transactionIndex', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('transactions', 'confirmations', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
      }, { transaction });

      await queryInterface.changeColumn('transactions', 'v', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'transactionHash', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'cumulativeGasUsed', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'gasUsed', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('transaction_receipts', 'logsBloom', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('transactions', 'transactionIndex', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
      throw error;
  }
  }
};
