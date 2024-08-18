'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('v2_dex_pool_reserves', {
        v2DexPairId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              key: 'id',
              model: {
                  tableName: 'v2_dex_pairs'
              }
          }
        },
        transactionLogId: {
          primaryKey: true,
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              key: 'id',
              model: {
                  tableName: 'transaction_logs'
              }
          }
        },
        timestamp: {
          primaryKey: true,
          type: 'TIMESTAMPTZ',
          allowNull: false,
        },
        reserve0 : {
          type: Sequelize.STRING,
          allowNull: false,
        },
        reserve1: {
          type: Sequelize.STRING,
          allowNull: false
        },
        token0ContractId: {
          primaryKey: true,
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              key: 'id',
              model: {
                  tableName: 'contracts'
              }
          }
        },
        token1ContractId: {
          primaryKey: true,
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              key: 'id',
              model: {
                  tableName: 'contracts'
              }
          }
        }
      }, { transaction });

      await queryInterface.sequelize.query(`SELECT create_hypertable('v2_dex_pool_reserves', 'timestamp');`, { transaction });

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
        await queryInterface.dropTable('v2_dex_pool_reserves', { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};
