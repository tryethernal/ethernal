/**
 * @fileoverview TokenBalanceChangeEvent model - TimescaleDB hypertable for balance analytics.
 * Stores denormalized balance change data for holder history queries.
 *
 * @module models/TokenBalanceChangeEvent
 *
 * @property {number} workspaceId - Workspace ID
 * @property {number} tokenBalanceChangeId - Balance change ID
 * @property {Date} timestamp - Event timestamp (primary key)
 * @property {string} token - Token contract address
 * @property {string} address - Account address
 * @property {string} currentBalance - Balance after change
 */

'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class TokenBalanceChangeEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TokenBalanceChangeEvent.belongsTo(models.TokenBalanceChange, { foreignKey: 'tokenBalanceChangeId', as: 'tokenBalanceChange' });
    }

    /**
     * Deletes this event only.
     * `timestamp` is the sole Sequelize primary key, so the default instance destroy would delete the
     * events of every workspace sharing the same second. Scope the delete to the workspace and parent balance change.
     * @param {Object} [options] - Destroy options (`transaction` is forwarded)
     * @returns {Promise<number>} Number of deleted rows
     */
    destroy(options = {}) {
      return this.constructor.destroy({
        where: { workspaceId: this.workspaceId, tokenBalanceChangeId: this.tokenBalanceChangeId, timestamp: this.timestamp },
        transaction: options.transaction
      });
    }
  }
  TokenBalanceChangeEvent.init({
    workspaceId: DataTypes.INTEGER,
    tokenBalanceChangeId: DataTypes.INTEGER,
    blockNumber: DataTypes.INTEGER,
    timestamp: {
      primaryKey: true,
      type: DataTypes.DATE,
      set(value) {
        if (String(value).length > 10)
          this.setDataValue('timestamp', moment(value).format());
        else
          this.setDataValue('timestamp', moment.unix(value).format());
      }
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
