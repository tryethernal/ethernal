/**
 * @fileoverview TransactionEvent model - TimescaleDB hypertable for transaction analytics.
 * Stores denormalized transaction data for time-series queries.
 *
 * @module models/TransactionEvent
 *
 * @property {number} workspaceId - Workspace ID
 * @property {number} transactionId - Transaction ID
 * @property {Date} timestamp - Event timestamp (primary key)
 * @property {string} transactionFee - Total transaction fee
 * @property {string} gasPrice - Gas price used
 * @property {string} gasUsed - Gas consumed
 */

'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class TransactionEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    /**
     * Deletes this event only.
     * `timestamp` is the sole Sequelize primary key, so the default instance destroy would delete the
     * events of every workspace sharing the same second. Scope the delete to the workspace and parent transaction.
     * @param {Object} [options] - Destroy options (`transaction` is forwarded)
     * @returns {Promise<number>} Number of deleted rows
     */
    destroy(options = {}) {
      return this.constructor.destroy({
        where: { workspaceId: this.workspaceId, transactionId: this.transactionId, timestamp: this.timestamp },
        transaction: options.transaction
      });
    }
  }
  TransactionEvent.init({
    workspaceId: DataTypes.INTEGER,
    transactionId: DataTypes.INTEGER,
    blockNumber: DataTypes.INTEGER,
    timestamp: {
      type: DataTypes.DATE,
      primaryKey: true,
      set(value) {
        if (String(value).length > 10)
          this.setDataValue('timestamp', moment(value).format());
        else
          this.setDataValue('timestamp', moment.unix(value).format());
      }
    },
    transactionFee: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    gasUsed: DataTypes.STRING,
    from: DataTypes.STRING,
    to: DataTypes.STRING
  }, {
    sequelize,
    timestamps: false,
    modelName: 'TransactionEvent',
    tableName: 'transaction_events'
  });
  return TransactionEvent;
};
