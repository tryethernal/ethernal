'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('transaction_logs', {
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
            }
          },
          transactionReceiptId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                    tableName: 'transaction_receipts'
                }
            },
            onDelete: 'CASCADE'
          },
          address: {
            type: Sequelize.STRING,
            allowNull: false
          },
          blockHash: {
            type: Sequelize.STRING,
            allowNull: false
          },
          blockNumber: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          data: {
            type: Sequelize.STRING,
            allowNull: false
          },
          logIndex: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          topics: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false
          },
          transactionHash: {
            type: Sequelize.STRING,
            allowNull: false
          },
          transactionIndex: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          raw: {
              type: Sequelize.JSON,
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

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY transaction_logs
            ADD CONSTRAINT unique_transactionHash_logIndex_workspaceId_transaction_logs
            UNIQUE ("transactionHash", "workspaceId", "logIndex");
        `, { transaction });

        await transaction.commit();
    } catch(error) {
        console.log(error);
        await transaction.rollback();
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transaction_logs');
  }
};