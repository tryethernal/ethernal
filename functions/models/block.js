'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Block extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Block.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }

    static getByNumberAndWorkspace(number, workspaceId) {
        return Block.findOne({
            where: {
                number: number,
                workspaceId: workspaceId
            }
        });
    }
  }
  Block.init({
    baseFeePerGas: DataTypes.STRING,
    difficulty: DataTypes.INTEGER,
    extraData: DataTypes.TEXT,
    gasLimit: DataTypes.STRING,
    gasUsed: DataTypes.STRING,
    hash: DataTypes.STRING,
    miner: DataTypes.STRING,
    nonce: DataTypes.STRING,
    number: DataTypes.INTEGER,
    parentHash: DataTypes.STRING,
    timestamp: DataTypes.STRING,
    raw: DataTypes.JSON,
    workspaceId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Block',
    tableName: 'blocks'
  });
  return Block;
};