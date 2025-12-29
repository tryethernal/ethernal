/**
 * @fileoverview FaucetDrip model - records individual faucet drip transactions.
 * Tracks recipient address, amount, and transaction hash for each drip.
 *
 * @module models/FaucetDrip
 *
 * @property {number} id - Primary key
 * @property {number} explorerFaucetId - Foreign key to faucet
 * @property {string} address - Recipient address
 * @property {string} amount - Drip amount
 * @property {string} transactionHash - Transaction hash
 */

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
      FaucetDrip.belongsTo(models.ExplorerFaucet, { foreignKey: 'explorerFaucetId', as: 'faucet' });
    }
  }
  FaucetDrip.init({
    explorerFaucetId: DataTypes.INTEGER,
    address: {
      type: DataTypes.STRING,
      set(value) {
          this.setDataValue('address', value.toLowerCase());
      }
    },
    amount: DataTypes.STRING,
    transactionHash: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'FaucetDrip',
    tableName: 'faucet_drips'
  });
  return FaucetDrip;
};