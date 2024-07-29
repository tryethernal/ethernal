'use strict';
const {
  Model
} = require('sequelize');
const { enqueue } = require('../lib/queue');
module.exports = (sequelize, DataTypes) => {
  class V2DexPair extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      V2DexPair.belongsTo(models.ExplorerV2Dex, { foreignKey: 'explorerV2DexId', as: 'dex' });
      V2DexPair.belongsTo(models.Contract, { foreignKey: 'token0ContractId', as: 'token0' });
      V2DexPair.belongsTo(models.Contract, { foreignKey: 'token1ContractId', as: 'token1' });
      V2DexPair.belongsTo(models.Contract, { foreignKey: 'pairContractId', as: 'pair' });
      V2DexPair.hasMany(models.V2DexPoolReserve, { foreignKey: 'v2DexPairId', as: 'poolReserves' });
    }

    async getLatestReserves() {
      const [latestReserve] = await this.getPoolReserves({
        order: [['timestamp', 'DESC']],
        limit: 1
      });

      return latestReserve;
    }

    async safeDestroy(transaction) {
      const reserves = await this.getPoolReserves();
      for (const reserve of reserves) {
        await reserve.destroy({ transaction });
      }
      return this.destroy({ transaction });
    }
  }
  V2DexPair.init({
    explorerV2DexId: DataTypes.INTEGER,
    token0ContractId: DataTypes.INTEGER,
    token1ContractId: DataTypes.INTEGER,
    pairContractId: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    hooks: {
      afterCreate(pair) {
        return enqueue('setupV2DexPoolReserves', `setupV2DexPoolReserves-${pair.id}`, { v2DexPairId: pair.id });
      }
    },
    sequelize,
    modelName: 'V2DexPair',
    tableName: 'v2_dex_pairs'
  });
  return V2DexPair;
};
