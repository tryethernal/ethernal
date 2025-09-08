'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('blocks', 'logsBloom', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'mixHash', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'receiptsRoot', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'sendCount', {
        type: Sequelize.BIGINT,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'sendRoot', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'sha3Uncles', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'size', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'stateRoot', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'transactionsRoot', {
        type: Sequelize.STRING(66),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'uncles', {
        type: Sequelize.JSON,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('blocks', 'withdrawals', {
        type: Sequelize.JSON,
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
      await queryInterface.removeColumn('blocks', 'logsBloom');
      await queryInterface.removeColumn('blocks', 'mixHash');
      await queryInterface.removeColumn('blocks', 'receiptsRoot');
      await queryInterface.removeColumn('blocks', 'sendCount');
      await queryInterface.removeColumn('blocks', 'sendRoot');
      await queryInterface.removeColumn('blocks', 'sha3Uncles');
      await queryInterface.removeColumn('blocks', 'size');
      await queryInterface.removeColumn('blocks', 'stateRoot');
      await queryInterface.removeColumn('blocks', 'transactionsRoot');
      await queryInterface.removeColumn('blocks', 'uncles');
      await queryInterface.removeColumn('blocks', 'withdrawals');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
