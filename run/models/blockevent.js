'use strict';
const {
  Model
} = require('sequelize');
const moment = require('moment');
const { trigger } = require('../lib/pusher');

module.exports = (sequelize, DataTypes) => {
  class BlockEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BlockEvent.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      BlockEvent.belongsTo(models.Block, { foreignKey: 'blockId', as: 'block' });
    }

    afterCreate(options) {
      const afterCreateFn = async () => {
        if (this.baseFeePerGas && this.priorityFeePerGas && this.priorityFeePerGas.length > 0)
          trigger(`private-cache-block-events;workspace=${this.workspaceId}`, 'new', {
            gasPrice: Number(this.baseFeePerGas) + Number(this.priorityFeePerGas[0]),
          });
      };

      if (options.transaction)
        return options.transaction.afterCommit(afterCreateFn);
      else
        return afterCreateFn();
    }
  }
  BlockEvent.init({
    workspaceId: DataTypes.INTEGER,
    blockId: DataTypes.INTEGER,
    number: DataTypes.INTEGER,
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
    transactionCount: DataTypes.INTEGER,
    baseFeePerGas: DataTypes.STRING,
    gasLimit: DataTypes.STRING,
    gasUsed: DataTypes.STRING,
    gasUsedRatio: DataTypes.STRING,
    priorityFeePerGas: DataTypes.ARRAY(DataTypes.STRING)
  }, {
    hooks: {
      afterBulkCreate(blockEvents, options) {
        return Promise.all(blockEvents.map(b => b.afterCreate(options)));
      },
      afterCreate(blockEvent, options) {
        return blockEvent.afterCreate(options);
      }
    },
    sequelize,
    timestamps: false,
    modelName: 'BlockEvent',
    tableName: 'block_events'
  });
  return BlockEvent;
};
