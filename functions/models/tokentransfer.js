'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TokenTransfer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenTransfer.belongsTo(models.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
    }
  }
  TokenTransfer.init({
    amount: DataTypes.STRING,
    dst: DataTypes.STRING,
    src: DataTypes.STRING,
    token: DataTypes.STRING,
    transactionId: DataTypes.INTEGER,
    tokenId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'TokenTransfer',
    tableName: 'token_transfers'
  });
  return TokenTransfer;
};