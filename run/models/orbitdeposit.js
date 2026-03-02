/**
 * @fileoverview OrbitDeposit model - tracks L1→L2 deposits on Orbit chains.
 * Stores deposit info and finalization status.
 *
 * @module models/OrbitDeposit
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to L2 workspace
 * @property {string} l1TransactionHash - L1 deposit transaction hash
 * @property {string} l2TransactionHash - L2 finalization transaction hash
 * @property {string} status - pending/confirmed
 */

'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class OrbitDeposit extends Model {
    static associate(models) {
      OrbitDeposit.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OrbitDeposit.belongsTo(models.Transaction, { foreignKey: 'l2TransactionId', as: 'l2Transaction' });
    }

    finalize({ l2TransactionId, l2TransactionHash }, transaction) {
        if (!l2TransactionId || !l2TransactionHash)
            throw new Error('Missing parameters');

        this.update({
            l2TransactionId,
            l2TransactionHash,
            status: 'confirmed'
        }, { transaction });
    }
  }

  OrbitDeposit.init({
    workspaceId: DataTypes.INTEGER,
    l1Block: DataTypes.INTEGER,
    l1TransactionHash: DataTypes.STRING(66),
    l2TransactionHash: DataTypes.STRING(66),
    l2TransactionId: DataTypes.INTEGER,
    messageIndex: DataTypes.INTEGER,
    sender: DataTypes.STRING(42),
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    status: DataTypes.ENUM('pending', 'confirmed', 'failed'),
  }, {
    sequelize,
    modelName: 'OrbitDeposit',
    tableName: 'orbit_deposits',
    timestamps: false,
  });

  return OrbitDeposit;
};
