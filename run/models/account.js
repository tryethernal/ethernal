'use strict';
const {
  Model
} = require('sequelize');
const { decrypt } = require('../lib/crypto');
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
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    balance: DataTypes.STRING,
    privateKey: {
         type: DataTypes.STRING,
         get() {
             return this.getDataValue('privateKey') ? decrypt(this.getDataValue('privateKey')) : null;
         }
    }
  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'accounts'
  });
  return Account;
};