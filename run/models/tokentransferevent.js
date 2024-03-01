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
    dst: DataTypes.STRING
  }, {

    sequelize,
    timestamps: false,
    modelName: 'TokenTransferEvent',
    tableName: 'token_transfer_events'
  });
  return TokenTransferEvent;
};
