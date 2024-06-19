'use strict';
const {
  Model
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const IUniswapV2Pair = require('../lib/abis/IUniswapV2Pair.json');

module.exports = (sequelize, DataTypes) => {
  class ExplorerV2Dex extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ExplorerV2Dex.belongsTo(models.Explorer, { foreignKey: 'explorerId', as: 'explorer' });
      ExplorerV2Dex.hasMany(models.V2DexPair, { foreignKey: 'explorerV2DexId', as: 'pairs' });
    }

    async safeCreatePair(token0, token1, pair) {
      if (!token0 || !token1 || !pair)
        throw new Error('Missing parameter');

      const explorer = await this.getExplorer();

      let [{ id: token0ContractId }] = await sequelize.models.Contract.findOrCreate({
        where: {
            workspaceId: explorer.workspaceId,
            address: token0.toLowerCase()
        }
      });
      let [{ id: token1ContractId }] = await sequelize.models.Contract.findOrCreate({
          where: {
              workspaceId: explorer.workspaceId,
              address: token1.toLowerCase()
          }
      });
      let [pairContract] = await sequelize.models.Contract.findOrCreate({
        where: {
            workspaceId: explorer.workspaceId,
            address: pair.toLowerCase()
        }
      });
      const pairContractProperties = sanitize({
        abi: pairContract.abi ? pairContract.abi : IUniswapV2Pair,
        name: pairContract.name ? pairContract.name : 'UniswapV2Pair'
      });
      await pairContract.update(pairContractProperties);

      return this.createPair({ token0ContractId, token1ContractId, pairContractId: pairContract.id });
    }
  }
  ExplorerV2Dex.init({
    routerAddress: DataTypes.INTEGER,
    factoryAddress: DataTypes.INTEGER,
    explorerId: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    hooks: {
      afterCreate(dex, options) {
        const afterCreateFn = () => {
          return enqueue('processExplorerV2Dex', `processExplorerV2Dex-${dex.id}`, { explorerDexId: dex.id })
        };
        return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
    },
    },
    sequelize,
    modelName: 'ExplorerV2Dex',
    tableName: 'explorer_v2_dexes'
  });
  return ExplorerV2Dex;
};