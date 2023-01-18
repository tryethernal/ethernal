'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');
const { sanitize } = require('../lib/utils');

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
      TokenTransfer.belongsTo(models.Contract, {
          sourceKey: 'address',
          foreignKey: 'token',
          as: 'contract',
          constraints: false,
          scope: {
              [Op.and]: sequelize.where(sequelize.col("TokenTransfer.workspaceId"),
                  Op.eq,
                  sequelize.col("contract.workspaceId")
              )
          }
      });
      TokenTransfer.hasMany(models.TokenBalanceChange, { foreignKey: 'tokenTransferId', as: 'tokenBalanceChanges' });
    }

    async safeCreateBalanceChange(balanceChange) {
        const existingChangeCount = await sequelize.models.TokenBalanceChange.count({
            where: {
                transactionId: this.transactionId,
                token: this.token,
                address: balanceChange.address
            }
        });

        if (existingChangeCount > 0)
            return;

        return await this.createTokenBalanceChange(sanitize({
            transactionId: this.transactionId,
            workspaceId: this.workspaceId,
            token: this.token,
            address: balanceChange.address,
            currentBalance: balanceChange.currentBalance,
            previousBalance: balanceChange.previousBalance,
            diff: balanceChange.diff
        }));
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
    processed: DataTypes.BOOLEAN
  }, {
    hooks: {
        async afterSave(tokenTransfer, options) {
            const transaction = await tokenTransfer.getTransaction({
                attributes: ['blockNumber', 'hash'],
                include: [
                    {
                        model: sequelize.models.TokenTransfer,
                        attributes: ['id', 'src', 'dst', 'token'],
                        as: 'tokenTransfers'
                    },
                    {
                        model: sequelize.models.Workspace,
                        attributes: ['id', 'public', 'rpcServer', 'name'],
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
                await enqueue('processTokenTransfer',
                    `processTokenTransfer-${tokenTransfer.workspaceId}-${tokenTransfer.token}-${tokenTransfer.id}`, {
                        tokenTransferId: tokenTransfer.id
                    }
                );
            }

            if (tokenTransfer.tokenId) {
                if (transaction.workspace.public) {
                    await enqueue('reloadErc721Token',
                        `reloadErc721Token-${tokenTransfer.workspaceId}-${tokenTransfer.token}-${tokenTransfer.tokenId}`, {
                            workspaceId: tokenTransfer.workspaceId,
                            address: tokenTransfer.token,
                            tokenId: tokenTransfer.tokenId
                        }
                    );
                }
                else {
                    const contract = await tokenTransfer.getContract()
                    await contract.update({ processed: false });
                    trigger(`private-contracts;workspace=${tokenTransfer.workspaceId}`, 'new', null);
                }
            }

            if (!transaction.workspace.public)
                trigger(`private-processableTransactions;workspace=${transaction.workspace.id}`, 'new', transaction.toJSON());
        }
    },
    sequelize,
    modelName: 'TokenTransfer',
    tableName: 'token_transfers'
  });
  return TokenTransfer;
};