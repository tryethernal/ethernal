'use strict';
const {
  Model
} = require('sequelize');
const { decrypt } = require('../lib/crypto');
const { trigger } = require('../lib/pusher');

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
            if (this.getDataValue('privateKey')) {
                const slicedKey = decrypt(this.getDataValue('privateKey')).startsWith('0x') ? decrypt(this.getDataValue('privateKey')).slice(0, 66) : decrypt(this.getDataValue('privateKey')).slice(0, 64);
                return this.getDataValue('privateKey') ? slicedKey : null;
            }
            else
                return null;
         }
    }
  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'accounts',
    hooks: {
        afterSave(account) {
            trigger(`private-accounts;workspace=${account.workspaceId}`, 'updated', null);
        }
    }
  });
  return Account;
};
