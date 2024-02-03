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

      return sequelize.models.TokenBalanceChange.create({
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
    hooks: {
      async afterCreate(tokenBalanceChange, options) {
        await tokenBalanceChange.insertAnalyticEvent(options.transaction);
      }
    },
    sequelize,
    modelName: 'TokenBalanceChange',
    tableName: 'token_balance_changes'
  });
  return TokenBalanceChange;
};