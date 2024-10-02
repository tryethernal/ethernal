'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class Block extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Block.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Block.hasMany(models.Transaction, { foreignKey: 'blockId', as: 'transactions' });
    }

    async safeDestroy(transaction) {
      const transactions = await this.getTransactions();
      for (let i = 0; i < transactions.length; i++)
        await transactions[i].safeDestroy(transaction);
      return this.destroy({ transaction });
    }

    async revertIfPartial() {
        const transactions = await this.getTransactions();
        const isSyncing = transactions.map(t => t.isSyncing).length > 0 || transactions.length != this.transactionsCount;

        if (!isSyncing)
          return;

        return sequelize.transaction(
          { deferrable: Sequelize.Deferrable.SET_DEFERRED },
          async transaction => this.safeDestroy(transaction)
        );
    }
  }
  Block.init({
    baseFeePerGas: DataTypes.STRING,
    difficulty: DataTypes.STRING,
    extraData: DataTypes.TEXT,
    gasLimit: DataTypes.STRING,
    gasUsed: DataTypes.STRING,
    hash: DataTypes.STRING,
    miner: DataTypes.STRING,
    nonce: DataTypes.STRING,
    number: DataTypes.INTEGER,
    parentHash: DataTypes.STRING,
    l1BlockNumber: DataTypes.INTEGER,
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            if (String(value).length > 10)
              this.setDataValue('timestamp', moment(value).format());
            else
              this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    transactionsCount: DataTypes.INTEGER,
    raw: DataTypes.JSON,
    workspaceId: DataTypes.INTEGER,
    state: DataTypes.ENUM('syncing', 'ready'),
    isReady: {
      type: DataTypes.VIRTUAL,
      get() {
          return this.getDataValue('state') === 'ready';
      }
    },
  }, {
    hooks: {
        async afterCreate(block, options) {
          const afterCreateFn = () => enqueue('processBlock', `processBlock-${block.id}`, { blockId: block.id });
          if (options.transaction)
            return options.transaction.afterCommit(afterCreateFn);
          else
            return afterCreateFn();
        },
        async afterSave(block, options) {
            const afterSaveFn = async () => {
                // We only refresh the frontend in real time if that's a recent block to avoid spamming requests
                if (Date.now() / 1000 - block.timestamp < 60 * 10)
                  trigger(`private-blocks;workspace=${block.workspaceId}`, 'new', { number: block.number, withTransactions: block.transactionsCount > 0 });
            };

            if (options.transaction)
                return options.transaction.afterCommit(afterSaveFn);
            else
                return afterSaveFn();
        }
    },
    sequelize,
    modelName: 'Block',
    tableName: 'blocks'
  });
  return Block;
};
