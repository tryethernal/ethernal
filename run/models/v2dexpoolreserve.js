'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class V2DexPoolReserve extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        V2DexPoolReserve.belongsTo(models.V2DexPair, { foreignKey: 'v2DexPairId', as: 'dexPair' });
        V2DexPoolReserve.belongsTo(models.Contract, { foreignKey: 'token0ContractId', as: 'token0' });
        V2DexPoolReserve.belongsTo(models.Contract, { foreignKey: 'token1ContractId', as: 'token1' });
    }
  }
  V2DexPoolReserve.init({
    v2DexPairId: DataTypes.INTEGER,
    transactionLogId: DataTypes.INTEGER,
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
    reserve0: DataTypes.STRING,
    reserve1: DataTypes.STRING,
    token0ContractId: DataTypes.INTEGER,
    token1ContractId: DataTypes.INTEGER,
  }, {
    sequelize,
    timestamps: false,
    modelName: 'V2DexPoolReserve',
    tableName: 'v2_dex_pool_reserves'
  });
  return V2DexPoolReserve;
};
