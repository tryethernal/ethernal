'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('explorer_v2_dexes', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        routerAddress: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        factoryAddress: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        explorerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            key: 'id',
            model: {
              tableName: 'explorers'
            }
          }
        },
        createdAt: {
          type: Sequelize.DATE
        },
        updatedAt: {
          type: Sequelize.DATE
        },
      }, { transaction });

      await queryInterface.createTable('v2_dex_pairs', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        explorerV2DexId: {
          type: Sequelize.INTEGER,
          references: {
            key: 'id',
            model: {
              tableName: 'explorer_v2_dexes'
            }
          }
        },
        token0ContractId: {
          type: Sequelize.INTEGER,
          references: {
            key: 'id',
            model: {
              tableName: 'contracts'
            }
          }
        },
        token1ContractId: {
          type: Sequelize.INTEGER,
          references: {
            key: 'id',
            model: {
              tableName: 'contracts'
            }
          }
        },
        pairContractId: {
          type: Sequelize.INTEGER,
          references: {
            key: 'id',
            model: {
              tableName: 'contracts'
            }
          }
        },
        createdAt: {
          type: Sequelize.DATE
        },
        updatedAt: {
          type: Sequelize.DATE
        },
      }, { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error);
        await transaction.rollback();
        throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
      try {
          await queryInterface.dropTable('v2_dex_pairs', { transaction });
          await queryInterface.dropTable('explorer_v2_dexes', { transaction });

          await transaction.commit();
      } catch(error) {
          console.log(error);
          await transaction.rollback();
          throw error;
      }
  }
};