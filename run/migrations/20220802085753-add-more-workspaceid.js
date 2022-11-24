'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        const tokenBalanceChanges = await queryInterface.sequelize.query('SELECT tbc.*, t."workspaceId" from "token_balance_changes" tbc LEFT JOIN transactions t ON tbc."transactionId" = t.id');
        const tokenTransfers = await queryInterface.sequelize.query('SELECT tf.*, t."workspaceId" from "token_transfers" tf LEFT JOIN transactions t ON tf."transactionId" = t.id');

        await queryInterface.addColumn('token_balance_changes', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
            },
        }, { transaction });

        await queryInterface.addColumn('token_transfers', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
            },
        }, { transaction });

        await queryInterface.addIndex(
          'token_balance_changes',
          {
              fields: ['workspaceId'],
              name: 'token_balance_changes_workspaceId_idx',
              transaction
          }
        );

        await queryInterface.addIndex(
          'token_transfers',
          {
              fields: ['workspaceId'],
              name: 'token_transfers_workspaceId_idx',
              transaction
          }
        );

        if (tokenBalanceChanges[0].length) {
            const newTokenBalanceChanges = tokenBalanceChanges[0].map(tokenBalanceChange => {
                return {
                    ...tokenBalanceChange,
                    workspaceId: tokenBalanceChange.workspaceId
                };
            });

            await queryInterface.bulkInsert('token_balance_changes', newTokenBalanceChanges, {
                transaction,
                updateOnDuplicate: ["workspaceId"],
                upsertKeys: ["id"]
            });
        }


        if (tokenTransfers[0].length) {
            const newTokenTransfers = tokenTransfers[0].map(tokenTransfer => {
                return {
                    ...tokenTransfer,
                    workspaceId: tokenTransfer.workspaceId
                };
            });

            await queryInterface.bulkInsert('token_transfers', newTokenTransfers, {
                transaction,
                updateOnDuplicate: ["workspaceId"],
                upsertKeys: ["id"]
            });
        }

        await queryInterface.changeColumn('token_balance_changes', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
            },
        }, { transaction });

        await queryInterface.changeColumn('token_transfers', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
            },
        }, { transaction });

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('token_balance_changes', 'workspaceId', { transaction });
      await queryInterface.removeColumn('token_transfers', 'workspaceId', { transaction });

      await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  }
};
