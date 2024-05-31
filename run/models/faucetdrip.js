'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FaucetDrip extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FaucetDrip.init({
    explorerFaucetId: DataTypes.INTEGER,
    amount: DataTypes.INTEGER,
    transactionHash: DataTypes.STRING,
    timestamp: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'FaucetDrip',
  });
  return FaucetDrip;
};