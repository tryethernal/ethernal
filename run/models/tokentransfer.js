'use strict';
const {
  Model
} = require('sequelize');
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');

module.exports = (sequelize, DataTypes) => {
  class TokenTransfer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenTransfer.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
      TokenTransfer.hasOne(models.Contract, {
          sourceKey: 'token',
          foreignKey: 'address',
          as: 'contract'
      });
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
    workspaceId: DataTypes.INTEGER,
  }, {
    hooks: {
        async afterSave(tokenTransfer, options) {
            const transaction = await tokenTransfer.getTransaction({
                attributes: ['blockNumber', 'hash'],
                include: [
                    {
                        model: sequelize.models.TokenTransfer,
                        attributes: ['src', 'dst', 'token'],
                        as: 'tokenTransfers'
                    },
                    {
                        model: sequelize.models.Workspace,
                        attributes: ['id', 'public'],
                        as: 'workspace'
                    }
                ]
            });

            if (tokenTransfer.tokenId && transaction.workspace.public)
                await enqueue('reloadErc721Token',
                    `reloadErc721Token-${tokenTransfer.workspaceId}-${tokenTransfer.token}-${tokenTransfer.tokenId}`, {
                        workspaceId: tokenTransfer.workspaceId,
                        address: tokenTransfer.token,
                        tokenId: tokenTransfer.tokenId
                    }
                );

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