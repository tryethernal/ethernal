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
