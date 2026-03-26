/**
 * @fileoverview TokenBalanceChange model - tracks token balance changes per address.
 * Records balance diffs from token transfers for analytics and history.
 *
 * @module models/TokenBalanceChange
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to workspace
 * @property {number} transactionId - Foreign key to transaction
 * @property {string} token - Token contract address
 * @property {string} address - Account address with balance change
 * @property {string} diff - Balance difference (positive or negative)
 * @property {string} currentBalance - Balance after the transaction
 */

'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const ethers = require('ethers');

module.exports = (sequelize, DataTypes) => {
  class TokenBalanceChange extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenBalanceChange.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
      TokenBalanceChange.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      TokenBalanceChange.belongsTo(models.TokenTransfer, { foreignKey: 'tokenTransferId', as: 'tokenTransfer' });
      TokenBalanceChange.hasOne(models.TokenBalanceChangeEvent, { foreignKey: 'tokenBalanceChangeId', as: 'event' });
      TokenBalanceChange.hasOne(models.Contract, {
          sourceKey: 'token',
          foreignKey: 'address',
          as: 'tokenContract',
          scope: {
              [Op.and]: sequelize.where(sequelize.col("TokenBalanceChange.workspaceId"),
                  Op.eq,
                  sequelize.col("tokenContract.workspaceId")
                ),
               },
             constraints: false
          });
    }

    getContract(options = {}) {
      return sequelize.models.Contract.findOne({
          where: {
              workspaceId: this.workspaceId,
              address: this.token
          },
          ...options
      });
    }

    async safeDestroy(transaction) {
      const event = await this.getEvent({ transaction });
      if (event)
        await event.destroy({ transaction });

      return this.destroy({ transaction });
    }

    async insertAnalyticEvent(sequelizeTransaction) {
      const transaction = await this.getTransaction({ transaction: sequelizeTransaction });
      const contract = await this.getContract({ transaction: sequelizeTransaction });

      return sequelize.models.TokenBalanceChangeEvent.create({
          workspaceId: this.workspaceId,
          tokenBalanceChangeId: this.id,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp,
          token: this.token,
          address: this.address,
          currentBalance: ethers.BigNumber.from(this.currentBalance).toString(),
          tokenType: contract ? contract.patterns[0] : null
      }, { transaction: sequelizeTransaction });
    }
  }
  TokenBalanceChange.init({
    transactionId: DataTypes.INTEGER,
    tokenTransferId: DataTypes.INTEGER,
    workspaceId: DataTypes.INTEGER,
    token: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('token', value.toLowerCase());
        }
    },
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    currentBalance: DataTypes.STRING,
    previousBalance: DataTypes.STRING,
    diff: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TokenBalanceChange',
    tableName: 'token_balance_changes'
  });
  return TokenBalanceChange;
};