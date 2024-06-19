'use strict';
const {
  Model
} = require('sequelize');
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
    sequelize,
    modelName: 'V2DexPair',
    tableName: 'v2_dex_pairs'
  });
  return V2DexPair;
};