'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const moment = require('moment');

const { trigger } = require('../lib/pusher');
const { enqueue, bulkEnqueue } = require('../lib/queue');
const { getNodeEnv } = require('../lib/env');

const STALLED_BLOCK_REMOVAL_DELAY = getNodeEnv() == 'production' ? 5 * 60 * 1000 : 15 * 60 * 1000;

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
      Block.hasOne(models.BlockEvent, { foreignKey: 'blockId', as: 'event' });
    }

    async safeDestroy(transaction) {
      const transactions = await this.getTransactions();
      for (let i = 0; i < transactions.length; i++)
        await transactions[i].safeDestroy(transaction);

      const event = await this.getEvent();
      if (event)
        await event.destroy({ transaction });

      return this.destroy({ transaction });
    }

    safeCreateEvent(event, transaction) {
      return this.createEvent({
        workspaceId: this.workspaceId,
        number: this.number,
        timestamp: this.timestamp,
        transactionCount: this.transactionsCount,
        baseFeePerGas: event.baseFeePerGas,
        gasLimit: event.gasLimit,
        gasUsed: event.gasUsed,
        gasUsedRatio: event.gasUsedRatio,
        priorityFeePerGas: event.priorityFeePerGas,
      }, { transaction });
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

    async afterCreate(options) {
        const afterCreateFn = async () => {
            if (Date.now() / 1000 - this.timestamp < 60 * 10)
                trigger(`private-blocks;workspace=${this.workspaceId}`, 'new', { number: this.number, withTransactions: this.transactionsCount > 0 });

            const workspace = await this.getWorkspace();
            if (workspace.public) {
                await enqueue('removeStalledBlock', `removeStalledBlock-${this.id}`, { blockId: this.id }, null, null, STALLED_BLOCK_REMOVAL_DELAY);

                if (workspace.tracing && workspace.tracing != 'hardhat') {
                    const jobs = [];
                    const transactions = await this.getTransactions();
                    for (let i = 0; i < transactions.length; i++) {
                        const transaction = transactions[i];
                        jobs.push({
                            name: `processTransactionTrace-${this.workspaceId}-${transaction.hash}`,
                            data: { transactionId: transaction.id }
                        });
                    }
                    await bulkEnqueue('processTransactionTrace', jobs);
                }

                if (workspace.integrityCheckStartBlockNumber === undefined || workspace.integrityCheckStartBlockNumber === null) {
                    const integrityCheckStartBlockNumber = this.number < 1000 ? 0 : this.number;
                    await workspace.update({ integrityCheckStartBlockNumber });
                }

                if (this.number == workspace.integrityCheckStartBlockNumber) {
                    await enqueue('integrityCheck', `integrityCheck-${this.workspaceId}`, { workspaceId: this.workspaceId });
                }
            }

            return enqueue('processBlock', `processBlock-${this.id}`, { blockId: this.id });
        };

        if (options.transaction)
            return options.transaction.afterCommit(afterCreateFn);
        else
            return afterCreateFn();
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
        afterBulkCreate(blocks, options) {
          return Promise.all(blocks.map(b => b.afterCreate(options)));
        },
        afterCreate(block, options) {
          return block.afterCreate(options);
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
