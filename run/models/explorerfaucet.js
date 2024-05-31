'use strict';
const {
  Model
} = require('sequelize');
const { decrypt } = require('../lib/crypto');
module.exports = (sequelize, DataTypes) => {
  class ExplorerFaucet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ExplorerFaucet.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
    }
  }
  ExplorerFaucet.init({
    explorerId: DataTypes.INTEGER,
    address: DataTypes.STRING,
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
    },
    amount: DataTypes.INTEGER,
    interval: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ExplorerFaucet',
  });
  return ExplorerFaucet;
};