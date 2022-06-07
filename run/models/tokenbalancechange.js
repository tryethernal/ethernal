'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TokenBalanceChange extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenBalanceChange.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' })
    }
  }
  TokenBalanceChange.init({
    transactionId: DataTypes.INTEGER,
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