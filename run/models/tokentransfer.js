'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op
const ethers = require('ethers');
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');
const { sanitize } = require('../lib/utils');
const logger = require('../lib/logger');

module.exports = (sequelize, DataTypes) => {
  class TokenTransfer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenTransfer.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
      TokenTransfer.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      TokenTransfer.hasOne(models.Contract, {
          sourceKey: 'token',
          foreignKey: 'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("TokenTransfer.workspaceId"),
                Op.eq,
                sequelize.col("contract.workspaceId")
            ),
          },
          constraints: false
      });
      TokenTransfer.hasOne(models.TokenTransferEvent, { foreignKey: 'tokenTransferId', as: 'event' });
      TokenTransfer.hasMany(models.TokenBalanceChange, { foreignKey: 'tokenTransferId', as: 'tokenBalanceChanges' });
    }

    async safeDestroy(transaction) {
        const tokenBalanceChanges = await this.getTokenBalanceChanges();
        for (let i = 0; i < tokenBalanceChanges.length; i++)
            await tokenBalanceChanges[i].safeDestroy(transaction);

        const event = await this.getEvent();
        if (event)
            await event.destroy({ transaction });

        return this.destroy({ transaction });
    }

    getContract() {
        return sequelize.models.Contract.findOne({
            where: {
                workspaceId: this.workspaceId,
                address: this.token
            }
        });
    }

    async insertAnalyticEvent(sequelizeTransaction) {
        const transaction = await this.getTransaction();
        const contract = await this.getContract();

        return sequelize.models.TokenTransferEvent.create({
            workspaceId: this.workspaceId,
            tokenTransferId: this.id,
            blockNumber: transaction.blockNumber,
            timestamp: transaction.timestamp,
            amount: ethers.BigNumber.from(this.amount).toString(),
            token: this.token,
            tokenType: contract ? contract.patterns[0] : null,
            src: this.src,
            dst: this.dst
        }, { transaction: sequelizeTransaction });
    }

    async safeCreateBalanceChange(balanceChange) {
        if (!balanceChange || !balanceChange.address || balanceChange.diff === '0') {
            return null; // Skip creation for invalid or zero balance changes
        }

        return sequelize.transaction(async (transaction) => {
            try {
                const [tokenBalanceChange] = await sequelize.models.TokenBalanceChange.bulkCreate([
                    sanitize({
                        transactionId: this.transactionId,
                        workspaceId: this.workspaceId,
                        tokenTransferId: this.id,
                        token: this.token,
                        address: balanceChange.address,
                        currentBalance: balanceChange.currentBalance,
                        previousBalance: balanceChange.previousBalance,
                        diff: balanceChange.diff
                    })
                ], {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction
                });

                if (tokenBalanceChange && tokenBalanceChange.id) {
                    await tokenBalanceChange.insertAnalyticEvent(transaction);
                }

                return tokenBalanceChange;
            } catch (error) {
                // Log the error but don't fail the entire job
                logger.error('Error creating balance change:', {
                    error: error.message,
                    tokenTransferId: this.id,
                    address: balanceChange.address,
                    token: this.token
                });
                throw error; // Re-throw to rollback transaction
            }
        });
    }

    async safeCreateBalanceChanges(balanceChanges) {
        if (!balanceChanges || !Array.isArray(balanceChanges) || balanceChanges.length === 0) {
            return []; // Return empty array for invalid input
        }

        // Filter out invalid or zero balance changes
        const validBalanceChanges = balanceChanges.filter(change => 
            change && change.address && change.diff !== '0'
        );

        if (validBalanceChanges.length === 0) {
            return []; // No valid changes to process
        }

        return sequelize.transaction(async (transaction) => {
            try {
                // Prepare all balance change records
                const balanceChangeRecords = validBalanceChanges.map(change => 
                    sanitize({
                        transactionId: this.transactionId,
                        workspaceId: this.workspaceId,
                        tokenTransferId: this.id,
                        token: this.token,
                        address: change.address,
                        currentBalance: change.currentBalance,
                        previousBalance: change.previousBalance,
                        diff: change.diff
                    })
                );

                // Bulk create all balance changes at once
                const createdBalanceChanges = await sequelize.models.TokenBalanceChange.bulkCreate(
                    balanceChangeRecords,
                    {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction
                    }
                );

                // Create analytic events for all created balance changes
                const analyticEventPromises = createdBalanceChanges
                    .filter(balanceChange => balanceChange && balanceChange.id)
                    .map(balanceChange => balanceChange.insertAnalyticEvent(transaction));

                // Wait for all analytic events to be created
                await Promise.all(analyticEventPromises);

                return createdBalanceChanges;
            } catch (error) {
                // Log the error but don't fail the entire job
                logger.error('Error creating balance changes:', {
                    error: error.message,
                    tokenTransferId: this.id,
                    token: this.token,
                    balanceChangesCount: validBalanceChanges.length
                });
                throw error; // Re-throw to rollback transaction
            }
        });
    }

    async afterCreate(options) {
        const transaction = await this.getTransaction({
            attributes: ['blockNumber', 'hash'],
            include: [
                {
                    model: sequelize.models.TokenTransfer,
                    attributes: ['id', 'src', 'dst', 'token'],
                    as: 'tokenTransfers',
                },
                {
                    model: sequelize.models.Workspace,
                    attributes: ['id', 'public', 'rpcServer', 'name', 'processNativeTokenTransfers'],
                    as: 'workspace',
                    include: {
                        model: sequelize.models.User,
                        attributes: ['firebaseUserId'],
                        as: 'user'
                    }
                }
            ]
        });

        if (transaction.workspace.public) {
            options.transaction.afterCommit(() => {
                if (transaction.workspace.processNativeTokenTransfers) {
                    return enqueue('processTokenTransfer',
                        `processTokenTransfer-${this.workspaceId}-${this.token}-${this.id}`, {
                            tokenTransferId: this.id
                        }
                    );
                }
            });

            if (this.tokenId)
                await enqueue('reloadErc721Token',
                    `reloadErc721Token-${this.workspaceId}-${this.token}-${this.tokenId}`, {
                        workspaceId: this.workspaceId,
                        address: this.token,
                        tokenId: this.tokenId
                    }
                );
        }

        if (!transaction.workspace.public)
            trigger(`private-processableTransactions;workspace=${transaction.workspace.id}`, 'new', transaction.toJSON());
    }
  }
  TokenTransfer.init({
    amount: DataTypes.STRING,
    dst: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('dst', value.toLowerCase());
        }
    },
    src: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('src', value.toLowerCase());
        }
    },
    token: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('token', value.toLowerCase());
        }
    },
    tokenId: {
        type: DataTypes.INTEGER,
        set(value) {
            this.setDataValue('tokenId', parseInt(value))
        }
    },
    transactionId: DataTypes.INTEGER,
    transactionLogId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    isReward: DataTypes.BOOLEAN
  }, {
    hooks: {
        afterBulkCreate(tokenTransfers, options) {
            return Promise.all(tokenTransfers.map(t => t.afterCreate(options)));
        },
        afterCreate(tokenTransfer, options) {
            return tokenTransfer.afterCreate(options);
        }
    },
    sequelize,
    modelName: 'TokenTransfer',
    tableName: 'token_transfers'
  });
  return TokenTransfer;
};
