/**
 * @fileoverview Block model - represents synchronized blockchain blocks.
 * Stores block headers, metadata, and manages block-related events.
 *
 * @module models/Block
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to workspace
 * @property {number} number - Block number
 * @property {string} hash - Block hash
 * @property {Date} timestamp - Block timestamp
 * @property {number} transactionsCount - Number of transactions in block
 * @property {string} miner - Block miner/validator address
 * @property {string} gasUsed - Total gas used
 * @property {string} gasLimit - Block gas limit
 * @property {string} baseFeePerGas - EIP-1559 base fee
 */

'use strict';
const ethers = require('ethers');
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
      Block.belongsTo(models.OrbitBatch, {
        foreignKey: 'orbitBatchId',
        as: 'orbitBatch'
      });
    }

    /**
     * Safely destroys the block along with its transactions and event.
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<void>}
     */
    async safeDestroy(transaction) {
      const transactions = await this.getTransactions();
      for (let i = 0; i < transactions.length; i++)
        await transactions[i].safeDestroy(transaction);

      const event = await this.getEvent();
      if (event)
        await event.destroy({ transaction });

      return this.destroy({ transaction });
    }

    /**
     * Creates a block event record for analytics.
     * @param {Object} event - Event data with gas metrics
     * @param {Object} [transaction] - Sequelize transaction
     * @returns {Promise<BlockEvent>}
     */
    safeCreateEvent(event, transaction) {
      return sequelize.models.BlockEvent.bulkCreate(
        [
            {
                blockId: this.id,
                workspaceId: this.workspaceId,
                number: this.number,
                timestamp: this.timestamp,
                transactionCount: this.transactionsCount,
                baseFeePerGas: event.baseFeePerGas,
                gasLimit: event.gasLimit,
                gasUsed: event.gasUsed,
                gasUsedRatio: event.gasUsedRatio,
                priorityFeePerGas: event.priorityFeePerGas ? Sequelize.literal(`ARRAY[${event.priorityFeePerGas.join(',')}]::numeric[]`) : undefined,
            }
        ],
        {
            ignoreDuplicates: true,
            returning: true,
            transaction
        }
      );
    }

    /**
     * Reverts the block if it's only partially synced.
     * Destroys the block and its transactions if syncing is incomplete or transaction count mismatches.
     * @returns {Promise<boolean>} True if block was reverted, false otherwise
     */
    async revertIfPartial() {
        // Check for syncing transactions first
        const syncingTransactionCount = await sequelize.models.Transaction.count({
            where: {
                blockId: this.id,
                state: 'syncing'
            }
        });

        // Short-circuit if we already know we need to revert
        if (syncingTransactionCount > 0) {
            await sequelize.transaction(
                { deferrable: Sequelize.Deferrable.SET_DEFERRED },
                async transaction => this.safeDestroy(transaction)
            );
            return true;
        }

        // Only check transaction count if transactionsCount is available and no transactions are syncing
        if (this.transactionsCount !== null && this.transactionsCount !== undefined) {
            const currentTransactionCount = await sequelize.models.Transaction.count({
                where: {
                    blockId: this.id
                }
            });

            if (currentTransactionCount !== this.transactionsCount) {
                await sequelize.transaction(
                    { deferrable: Sequelize.Deferrable.SET_DEFERRED },
                    async transaction => this.safeDestroy(transaction)
                );
                return true;
            }
        }

        return false;
    }

    /**
     * Post-creation hook for triggering real-time updates and background jobs.
     * Enqueues block processing and transaction trace jobs for public workspaces.
     * @param {Object} options - Hook options with optional transaction
     * @returns {Promise<void>}
     */
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

                return enqueue('processBlock', `processBlock-${this.id}`, { blockId: this.id });
            }
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
    orbitStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.getDataValue('orbitBatch'))
          return 'processed_on_rollup';

        let status = 'processed_on_rollup';
        const orbitBatch = this.getDataValue('orbitBatch');
        if (!orbitBatch)
          return status;
  
        status = 'pending_on_parent';
        if (orbitBatch.confirmationStatus == 'confirmed') {
          status = 'confirmed_on_parent';
          const orbitNode = orbitBatch.orbitNode;
          if (orbitNode)
            status = 'finalized_on_parent';
        }
  
        return status;
      }
    },
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
    orbitBatchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'orbit_batches',
        key: 'id'
      }
    },
    logsBloom: DataTypes.TEXT,
    mixHash: DataTypes.STRING(66),
    receiptsRoot: DataTypes.STRING(66),
    sendCount: {
      type: DataTypes.BIGINT,
      get() {
        return this.getDataValue('sendCount') || this.getDataValue('raw.sendCount');
      },
      set(value) {
        if (value)
          this.setDataValue('sendCount', ethers.BigNumber.from(value).toString());
        else
          this.setDataValue('sendCount', null);
      }
    },
    sendRoot: DataTypes.STRING(66),
    sha3Uncles: {
      type: DataTypes.STRING(66),
      get() {
        return this.getDataValue('sha3Uncles') ||this.getDataValue('raw.sha3Uncles');
      }
    },
    size: {
      type: DataTypes.INTEGER,
      get() {
        return this.getDataValue('size') || this.getDataValue('raw.size');
      }
    },
    stateRoot: {
      type: DataTypes.STRING(66),
      get() {
        return this.getDataValue('stateRoot') || this.getDataValue('raw.stateRoot');
      }
    },
    transactionsRoot: DataTypes.STRING(66),
    withdrawals: DataTypes.JSON
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
