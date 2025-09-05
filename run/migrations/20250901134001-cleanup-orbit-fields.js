'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('orbit_batches', 'batchHash', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'parentChainTxIndex', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'transactionCount', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'batchDataHash', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'batchSize', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'firstTxTimestamp', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'lastTxTimestamp', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'confirmedAt', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'finalizedAt', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'l1GasUsed', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'l1GasPrice', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'l1Cost', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'seqNumStart', { transaction });
      await queryInterface.removeColumn('orbit_batches', 'seqNumEnd', { transaction });

      await queryInterface.dropTable('orbit_batch_block', { transaction });

      await queryInterface.removeColumn('orbit_chain_configs', 'parentChainType', { transaction });
      await queryInterface.removeColumn('orbit_chain_configs', 'topParentChainBlockValidationType', { transaction });
      await queryInterface.removeColumn('orbit_chain_configs', 'confirmationPeriodBlocks', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orbit_chain_configs_parentChainType";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orbit_chain_configs_topParentChainBlockValidationType";', { transaction });

      await queryInterface.dropTable('orbit_transaction_states', { transaction });

      await queryInterface.addColumn('workspaces', 'isTopOrbitParent', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction });
      await queryInterface.removeColumn('workspaces', 'chainFamily', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_workspaces_chainFamily";', { transaction });

      await queryInterface.removeColumn('explorers', 'l1Explorer', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('orbit_batches', 'batchHash', { type: Sequelize.STRING(66), allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'parentChainTxIndex', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'transactionCount', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'batchDataHash', { type: Sequelize.STRING(66), allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'batchSize', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'firstTxTimestamp', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'lastTxTimestamp', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'confirmedAt', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'finalizedAt', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'l1GasUsed', { type: Sequelize.BIGINT, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'l1GasPrice', { type: Sequelize.STRING, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'l1Cost', { type: Sequelize.STRING, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'seqNumStart', { type: Sequelize.BIGINT, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_batches', 'seqNumEnd', { type: Sequelize.BIGINT, allowNull: true }, { transaction });

      await queryInterface.addColumn('orbit_chain_configs', 'confirmationPeriodBlocks', { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_chain_configs', 'parentChainType', { type: Sequelize.STRING, allowNull: true }, { transaction });
      await queryInterface.addColumn('orbit_chain_configs', 'topParentChainBlockValidationType', { type: Sequelize.STRING, allowNull: true }, { transaction });

      await queryInterface.removeColumn('workspaces', 'isTopOrbitParent', { transaction });
      await queryInterface.addColumn('workspaces', 'chainFamily', { type: Sequelize.ENUM('ARBITRUM'), allowNull: true, defaultValue: null }, { transaction });

      await queryInterface.addColumn('explorers', 'l1Explorer', { type: Sequelize.STRING, allowNull: true }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
