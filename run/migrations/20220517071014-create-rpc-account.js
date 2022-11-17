'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('accounts', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          workspaceId: {
              allowNull: false,
              type: Sequelize.INTEGER,
              references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
              }
            },
          address: {
            type: Sequelize.STRING,
            allowNull: false
          },
          balance: {
            type: Sequelize.STRING
          },
          privateKey: {
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

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY accounts
            ADD CONSTRAINT unique_workspaceId_address_accounts
            UNIQUE ("workspaceId", "address");
        `, { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error);
      await transaction.rollback();
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('accounts');
  }
};