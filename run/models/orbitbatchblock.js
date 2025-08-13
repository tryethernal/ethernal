'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitBatchBlock extends Model {
    static associate(models) {
      OrbitBatchBlock.belongsTo(models.Block, { foreignKey: 'blockId', as: 'block' });
      OrbitBatchBlock.belongsTo(models.OrbitBatch, { foreignKey: 'batchId', as: 'batch' });
    }
  }

  OrbitBatchBlock.init({
    blockId: DataTypes.INTEGER,
    batchId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'OrbitBatchBlock',
    tableName: 'orbit_batch_block'
  });

  return OrbitBatchBlock;
};