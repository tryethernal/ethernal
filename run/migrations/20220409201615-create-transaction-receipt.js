'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.createTable('transaction_receipts', {
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
          blockHash: {
            type: Sequelize.STRING,
            allowNull: false
          },
          blockNumber: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          byzantium: {
            type: Sequelize.BOOLEAN,
            allowNull: false
          },
          confirmations: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          cumulativeGasUsed: {
            type: Sequelize.STRING,
            allowNull: false
          },
          from: {
            type: Sequelize.STRING,
            allowNull: false
          },
          gasUsed: {
            type: Sequelize.STRING,
            allowNull: false
          },
          logsBloom: {
            type: Sequelize.TEXT,
            allowNull: false
          },
          status: {
            type: Sequelize.BOOLEAN,
            allowNull: false
          },
          to: {
            type: Sequelize.STRING
          },
          transactionHash: {
            type: Sequelize.STRING,
            allowNull: false
          },
          transactionIndex: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          type: {
            type: Sequelize.INTEGER,
          },
          transactionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                key: 'id',
                model: {
                    tableName: 'transactions'
                }
            },
            onDelete: 'CASCADE'
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
        });

        await queryInterface.addIndex(
          'transaction_receipts',
          {
              fields: ['transactionId'],
              unique: true,
              name: 'transaction_receipts_transactionId_idx',
              transaction
          }
        );

        await queryInterface.sequelize.query(`
            ALTER TABLE ONLY public.transaction_receipts
            ADD CONSTRAINT unique_transactionHash_workspaceId_transaction_receipts
            UNIQUE ("transactionHash", "workspaceId");
        `, { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transaction_receipts');
  }
};