'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('explorers', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'users'
                }
            }
          },
          workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'workspaces'
                }
            }
          },
          chainId: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          domain: {
            type: Sequelize.STRING,
            unique: true
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false
          },
          rpcServer: {
            type: Sequelize.STRING,
            allowNull: false
          },
          slug: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
          },
          themes: {
            type: Sequelize.JSON,
            allowNull: false,
            default: { light: {} }
          },
          token: {
            type: Sequelize.STRING
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
    await queryInterface.dropTable('explorers');
  }
};