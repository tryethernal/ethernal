'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TokenBalanceChangeEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TokenBalanceChangeEvent.init({
    workspaceId: DataTypes.INTEGER,
    tokenBalanceChangeId: DataTypes.INTEGER,
    blockNumber: DataTypes.INTEGER,
    timestamp: {
      primaryKey: true,
      type: DataTypes.DATE
    },
    token: DataTypes.STRING,
    address: DataTypes.STRING,
    currentBalance: DataTypes.NUMERIC,
    tokenType: DataTypes.STRING,
  }, {
    sequelize,
    timestamps: false,
    modelName: 'TokenBalanceChangeEvent',
    tableName: 'token_balance_change_events'
  });
  return TokenBalanceChangeEvent;
};
