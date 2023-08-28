'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const { trigger } = require('../lib/pusher');
const { bulkEnqueue } = require('../lib/queue');
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

    async revertIfPartial() {
        if (this.state !== 'syncing')
            return;

        return sequelize.transaction(
          { deferrable: Sequelize.Deferrable.SET_DEFERRED },
          async transaction => {
            const transactions = await this.getTransactions();
            for (let i = 0; i < transactions.length; i++)
              await transactions[i].destroy({ transaction });
            return this.destroy({ transaction });
          }
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
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    transactionsCount: DataTypes.INTEGER,
    raw: DataTypes.JSON,
    workspaceId: DataTypes.INTEGER,
    state: DataTypes.ENUM('syncing', 'ready')
  }, {
    hooks: {
        async afterCreate(block, options) {
          const workspace = await block.getWorkspace();
          if (workspace.public) {
            const afterCreateFn = async () => {
              const transactions = block.transactions;
              const jobs = [];
              for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                jobs.push({
                  name: `receiptSync-${workspace.id}-${transaction.hash}`,
                  data: { transactionId: transaction.id }
                });
              }
              await bulkEnqueue('receiptSync', jobs);
              if (workspace.tracing == 'other') {
                const jobs = [];
                for (let i = 0; i < transactions.length; i++) {
                  const transaction = transactions[i];
                  jobs.push({
                    name: `processTransactionTrace-${workspace.id}-${transaction.hash}`,
                    data: { transactionId: transaction.id }
                  });
                }
                await bulkEnqueue('processTransactionTrace', jobs);
              }
            }
            if (options.transaction)
              return options.transaction.afterCommit(afterCreateFn);
            else
              return afterCreateFn();
          }
        },
        async afterSave(block, options) {
            const afterSaveFn = async () => {
                // We only refresh the frontend in real time if that's a recent block to avoid spamming requests
                const workspace = await block.getWorkspace();
                const [latestBlock] = await workspace.getBlocks({ order: [['number', 'DESC']], limit: 1 });
                if (latestBlock.number - block.number < 10)
                  await trigger(`private-blocks;workspace=${block.workspaceId}`, 'new', { number: block.number, withTransactions: block.transactionsCount > 0 });
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
