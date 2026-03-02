/**
 * @fileoverview TokenTransferEvent model - TimescaleDB hypertable for token transfer analytics.
 * Stores denormalized token transfer data for time-series queries.
 *
 * @module models/TokenTransferEvent
 *
 * @property {number} workspaceId - Workspace ID
 * @property {number} tokenTransferId - Token transfer ID
 * @property {Date} timestamp - Event timestamp (primary key)
 * @property {string} amount - Transfer amount
 * @property {string} token - Token contract address
 * @property {string} tokenType - Token type (erc20, erc721, erc1155)
 */

'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class TokenTransferEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }
  TokenTransferEvent.init({
    workspaceId: DataTypes.INTEGER,
    tokenTransferId: DataTypes.INTEGER,
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
    amount: DataTypes.NUMERIC,
    token: DataTypes.STRING,
    tokenType: DataTypes.STRING,
    src: DataTypes.STRING,
    dst: DataTypes.STRING,
    isReward: DataTypes.BOOLEAN
  }, {

    sequelize,
    timestamps: false,
    modelName: 'TokenTransferEvent',
    tableName: 'token_transfer_events'
  });
  return TokenTransferEvent;
};
