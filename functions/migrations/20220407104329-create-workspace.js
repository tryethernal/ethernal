'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('workspaces', {
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
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        chain: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'ethereum'
        },
        networkId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        public: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        rpcServer: {
          type: Sequelize.STRING,
          allowNull: false
        },
        defaultAccount: {
          type: Sequelize.STRING
        },
        gasLimit: {
          type: Sequelize.STRING
        },
        gasPrice: {
          type: Sequelize.STRING
        },
        apiEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        alchemyIntegrationEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
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

      await queryInterface.addConstraint(
        'users',
        {
          fields: ['currentWorkspaceId'],
          type: 'foreign key',
          name: 'fk_currentWorkspaceId_workspaces_id',
          references: {
            table: 'workspaces',
            field: 'id'
          },
          transaction
        }
      );

      await queryInterface.addConstraint(
        'workspaces',
        {
          fields: ['name', 'userId'],
          type: 'unique',
          name: 'workspaces_name_userId_is_unique',
          transaction
        }
      );

      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('users', 'fk_currentWorkspaceId_workspaces_id');
    await queryInterface.dropTable('workspaces');
  }
};