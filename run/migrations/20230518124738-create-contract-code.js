'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('contract_verifications', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'workspaces'
                }
            },
            onDelete: 'CASCADE'
          },
          contractId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'contracts'
                }
            },
            onDelete: 'CASCADE'
          },
          compilerVersion: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          evmVersion: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          contractName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          runs: {
            type: Sequelize.INTEGER
          },
          libraries: {
            type: Sequelize.JSON,
          },
          constructorArguments: {
            type: Sequelize.TEXT
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
        });
        await queryInterface.createTable('contract_sources', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          contractVerificationId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'contract_verifications'
                }
            },
            onDelete: 'CASCADE'
          },
          workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'workspaces'
                }
            },
            onDelete: 'CASCADE'
          },
          contractId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'contracts'
                }
            },
            onDelete: 'CASCADE'
          },
          fileName: {
            type: Sequelize.STRING,
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: false
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
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
      await queryInterface.dropTable('contract_sources');
      await queryInterface.dropTable('contract_verifications');
      await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
        throw error;
    }
  }
};