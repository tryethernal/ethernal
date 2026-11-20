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
// NOTE: `enqueue`/`bulkEnqueue` are intentionally NOT destructured at module load.
// `lib/queue` is part of a circular load chain (models/block → lib/queue → lib/queueCaps
// → models/*), and a top-level destructure here can capture `undefined` if this file
// loads while lib/queue is still mid-init. Resolve at hook-call time instead — by then
// require cache is populated. See issue #1318 for the failure mode + stack trace.
const { getNodeEnv } = require('../lib/env');
const quota = require('../lib/quota');

const Op = Sequelize.Op;

const STALLED_BLOCK_REMOVAL_DELAY = getNodeEnv() == 'production' ? 5 * 60 * 1000 : 15 * 60 * 1000;
// A block whose transactions are still `syncing` (receipts merely queued) is only reverted once it is older than this
const STALLED_BLOCK_MAX_AGE = getNodeEnv() == 'production' ? 60 * 60 * 1000 : 30 * 60 * 1000;

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
     * Safely destroys the block along with everything that depends on it, using one set-based
     * delete per table (no per-row loops), in foreign-key safe order, inside the given transaction.
     * Every statement is scoped to the block's workspace. When the explorer's transactions are counted
     * at storage time (see lib/quota), the deleted transactions are also given back to its quota.
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<void>}
     * @throws {Error} If the block has no valid workspaceId
     */
    async safeDestroy(transaction) {
      const workspaceId = parseInt(this.workspaceId, 10);
      if (!Number.isInteger(workspaceId))
        throw new Error('Block is missing a workspaceId');

      const models = sequelize.models;
      const transactions = await models.Transaction.findAll({
        where: { blockId: this.id, workspaceId },
        attributes: ['id'],
        raw: true,
        transaction
      });
      const transactionIds = transactions.map(t => parseInt(t.id, 10));
      let quotaSubscriptionId = null;
      let deletedTransactionCount = 0;

      if (transactionIds.length) {
        if (quota.canCountAtStorage()) {
          const explorer = await models.Explorer.findOne({
            where: { workspaceId },
            attributes: ['id'],
            include: [
              { model: models.Workspace, as: 'workspace', attributes: ['id', 'public'] },
              {
                model: models.StripeSubscription,
                as: 'stripeSubscription',
                attributes: ['id'],
                include: [{ model: models.StripePlan, as: 'stripePlan', attributes: ['id', 'slug'] }]
              }
            ],
            transaction
          });
          quotaSubscriptionId = quota.getQuotaSubscriptionId(explorer && explorer.workspace, explorer);
        }

        const ids = transactionIds.join(',');
        const receiptIds = `SELECT id FROM transaction_receipts WHERE "workspaceId" = ${workspaceId} AND "transactionId" IN (${ids})`;
        const logIds = `SELECT id FROM transaction_logs WHERE "workspaceId" = ${workspaceId} AND "transactionReceiptId" IN (${receiptIds})`;
        const tokenTransferIds = `SELECT id FROM token_transfers WHERE "workspaceId" = ${workspaceId} AND ("transactionId" IN (${ids}) OR "transactionLogId" IN (${logIds}))`;
        const tokenBalanceChangeIds = `SELECT id FROM token_balance_changes WHERE "workspaceId" = ${workspaceId} AND ("transactionId" IN (${ids}) OR "tokenTransferId" IN (${tokenTransferIds}))`;

        await models.TransactionTraceStep.destroy({
          where: { workspaceId, transactionId: transactionIds },
          transaction
        });
        await models.TransactionEvent.destroy({
          where: { workspaceId, transactionId: transactionIds },
          transaction
        });
        await models.TokenBalanceChangeEvent.destroy({
          where: { workspaceId, tokenBalanceChangeId: { [Op.in]: Sequelize.literal(`(${tokenBalanceChangeIds})`) } },
          transaction
        });
        await models.TokenBalanceChange.destroy({
          where: {
            workspaceId,
            [Op.or]: [
              { transactionId: transactionIds },
              { tokenTransferId: { [Op.in]: Sequelize.literal(`(${tokenTransferIds})`) } }
            ]
          },
          transaction
        });
        await models.TokenTransferEvent.destroy({
          where: { workspaceId, tokenTransferId: { [Op.in]: Sequelize.literal(`(${tokenTransferIds})`) } },
          transaction
        });
        await models.TokenTransfer.destroy({
          where: {
            workspaceId,
            [Op.or]: [
              { transactionId: transactionIds },
              { transactionLogId: { [Op.in]: Sequelize.literal(`(${logIds})`) } }
            ]
          },
          transaction
        });
        await models.TransactionLog.destroy({
          where: { workspaceId, transactionReceiptId: { [Op.in]: Sequelize.literal(`(${receiptIds})`) } },
          transaction
        });
        await models.TransactionReceipt.destroy({
          where: { workspaceId, transactionId: transactionIds },
          transaction
        });
        await models.Contract.update(
          { transactionId: null },
          { where: { workspaceId, transactionId: transactionIds }, transaction }
        );
        deletedTransactionCount = await models.Transaction.destroy({
          where: { workspaceId, blockId: this.id },
          transaction
        });
      }

      await models.BlockEvent.destroy({
        where: { workspaceId, blockId: this.id },
        transaction
      });

      const destroyed = await this.destroy({ transaction });

      // Last statement: the subscription row is shared by every block of the explorer, so keep its lock short
      if (quotaSubscriptionId && deletedTransactionCount > 0) {
        await models.StripeSubscription.update(
          { transactionQuota: Sequelize.literal(`GREATEST("transactionQuota" - ${parseInt(deletedTransactionCount, 10)}, 0)`) },
          { where: { id: quotaSubscriptionId }, transaction }
        );
      }

      return destroyed;
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
        return (await this.checkPartial()) == 'reverted';
    }

    /**
     * Reverts the block if it's only partially synced, optionally giving young blocks time to finish syncing.
     * A transaction count mismatch is always reverted immediately. A block with `syncing` transactions
     * (and the expected transaction count) younger than `syncingGraceMs` is left untouched, since its
     * receipts are probably just queued.
     * @param {Object} [options]
     * @param {number} [options.syncingGraceMs=0] - Minimum block age (ms) before `syncing` transactions trigger a revert
     * @returns {Promise<string>} 'reverted', 'deferred' (still syncing, within the grace period) or 'complete'
     */
    async checkPartial({ syncingGraceMs = 0 } = {}) {
        // One query for both counts. Include workspaceId for efficient TimescaleDB hypertable querying
        const [counts] = await sequelize.models.Transaction.findAll({
            attributes: [
                [Sequelize.literal('COUNT(*)'), 'total'],
                [Sequelize.literal(`COUNT(*) FILTER (WHERE "state" = 'syncing')`), 'syncing']
            ],
            where: {
                blockId: this.id,
                workspaceId: this.workspaceId
            },
            raw: true
        });
        const totalTransactionCount = parseInt(counts.total, 10);
        const syncingTransactionCount = parseInt(counts.syncing, 10);

        const hasExpectedCount = this.transactionsCount === null
            || this.transactionsCount === undefined
            || totalTransactionCount === this.transactionsCount;

        if (hasExpectedCount) {
            if (syncingTransactionCount == 0)
                return 'complete';

            // A missing/invalid createdAt gives NaN, which is never "young": we revert as before
            const age = Date.now() - new Date(this.createdAt).getTime();
            if (syncingGraceMs > 0 && age < syncingGraceMs)
                return 'deferred';
        }

        await sequelize.transaction(
            { deferrable: Sequelize.Deferrable.SET_DEFERRED },
            async transaction => this.safeDestroy(transaction)
        );
        return 'reverted';
    }

    /**
     * Post-creation hook for triggering real-time updates and background jobs.
     * Enqueues block processing and transaction trace jobs for public workspaces.
     * @param {Object} options - Hook options with optional transaction
     * @returns {Promise<void>}
     */
    async afterCreate(options) {
        const afterCreateFn = async () => {
            const { enqueue, bulkEnqueue } = require('../lib/queue');

            if (Date.now() / 1000 - this.timestamp < 60 * 10)
                trigger(`private-blocks;workspace=${this.workspaceId}`, 'new', { number: this.number, withTransactions: this.transactionsCount > 0 });

            // Use cached workspace if provided to prevent N+1 queries during bulk operations
            const workspace = options.cachedWorkspace || await this.getWorkspace();
            if (workspace.public) {
                await enqueue('removeStalledBlock', `removeStalledBlock-${this.id}`, { blockId: this.id, workspaceId: this.workspaceId }, null, null, STALLED_BLOCK_REMOVAL_DELAY);

                if (workspace.tracing && workspace.tracing != 'hardhat') {
                    // Skip transaction trace job creation in afterCreate hook when running within safeCreatePartialBlock
                    // This prevents connection timeouts when trying to fetch transactions before they're inserted
                    if (!options.skipTransactionTraceJobs) {
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
                }

                if (workspace.integrityCheckStartBlockNumber === undefined || workspace.integrityCheckStartBlockNumber === null) {
                    const integrityCheckStartBlockNumber = this.number < 1000 ? 0 : this.number;
                    await workspace.update({ integrityCheckStartBlockNumber });
                }

                if (this.number == workspace.integrityCheckStartBlockNumber) {
                    await enqueue('integrityCheck', `integrityCheck-${this.workspaceId}`, { workspaceId: this.workspaceId });
                }

                return enqueue('processBlock', `processBlock-${this.id}`, { blockId: this.id, workspaceId: this.workspaceId });
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

module.exports.STALLED_BLOCK_REMOVAL_DELAY = STALLED_BLOCK_REMOVAL_DELAY;
module.exports.STALLED_BLOCK_MAX_AGE = STALLED_BLOCK_MAX_AGE;
