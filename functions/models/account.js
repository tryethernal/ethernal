'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Account extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Account.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }
  }
  Account.init({
    workspaceId: DataTypes.INTEGER,
    address: DataTypes.STRING,
    balance: DataTypes.STRING,
    privateKey: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'accounts'
  });
  return Account;
};