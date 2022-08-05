'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        await queryInterface.addColumn('token_balance_changes', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                key: 'id',
                model: {
                  tableName: 'workspaces'
                }
            },
        }, { transaction });

        await queryInterface.addColumn('token_transfers', 'workspaceId', {
            type: Sequelize.INTEGER,
            allowNull: false,
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

        const TokenBalanceChange = Sequelize.models.TokenBalanceChange;
        const TokenTransfer = Sequelize.models.TokenTransfer;
        const Transaction = Sequelize.models.Transaction;

        const tokenBalanceChanges = await TokenBalanceChange.findAll({
            include: {
                model: Transaction,
                as: 'transaction'
            }
        });
        const tokenTransfers = await TokenTransfer.findAll({
            include: {
                model: Transaction,
                as: 'transaction'
            }
        });

        const newTokenBalanceChanges = tokenBalanceChanges.map(tokenBalanceChange => {
            return {
                ...tokenBalanceChange,
                workspaceId: tokenBalanceChange.transaction.workspaceId
            };
        });
        await TokenBalanceChange.bulkCreate(newTokenBalanceChanges, {
            transaction,
            updateOnDuplicate: ["workspaceId"]
        });

        const newTokenTransfers = tokenTransfers.map(tokenTransfer => {
            return {
                ...tokenTransfer,
                workspaceId: tokenTransfer.transaction.workspaceId
            };
        });
        await TokenTransfer.bulkCreate(newTokenTransfers, {
            transaction,
            updateOnDuplicate: ["workspaceId"]
        });

        await transaction.commit();
    } catch(error) {
      console.log(error)
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
      await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_balance_changes
        DROP CONSTRAINT token_balance_changes_workspaceId_idx
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE ONLY token_balance_changes
        DROP CONSTRAINT token_transfers_workspaceId_idx
      `);
      await queryInterface.removeColumn('token_balance_changes', 'workspaceId');
      await queryInterface.removeColumn('token_transfers', 'workspaceId');
  }
};
