'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const Op = Sequelize.Op;
module.exports = (sequelize, DataTypes) => {
  class TransactionLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionLog.belongsTo(models.TransactionReceipt, { foreignKey: 'transactionReceiptId', as: 'receipt' });
      TransactionLog.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      TransactionLog.hasOne(models.Contract, {
          sourceKey: 'address',
          foreignKey:  'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("TransactionLog.workspaceId"),
                Op.eq,
                sequelize.col("contract.workspaceId")
              ),
            },
          constraints: false
      });
      TransactionLog.hasOne(models.TokenTransfer, { foreignKey: 'transactionLogId', as: 'tokenTransfer' });
      TransactionLog.hasOne(models.V2DexPoolReserve, { foreignKey: 'transactionLogId', as: 'v2DexPoolReserve' });
    }

    async safeCreateTokenTransfer(tokenTransfer, transaction) {
        const existingTokenTransferCount = await sequelize.models.TokenTransfer.count({
            where: { transactionLogId: this.id }
        });

        if (existingTokenTransferCount > 0)
            return;

        const transactionReceipt = await this.getReceipt();
        const sanitizedTokenTransfer = sanitize({
            amount: tokenTransfer.amount,
            dst: tokenTransfer.dst,
            src: tokenTransfer.src,
            token: tokenTransfer.token,
            tokenId: tokenTransfer.tokenId,
            transactionId: transactionReceipt.transactionId,
            workspaceId: this.workspaceId
        });
        const insertedTokenTransfer = await this.createTokenTransfer(sanitizedTokenTransfer, { transaction: transaction });
        return insertedTokenTransfer.insertAnalyticEvent(transaction);
    }

    async safeDestroy(transaction) {
      const tokenTransfer = await this.getTokenTransfer();
      if (tokenTransfer)
        await tokenTransfer.safeDestroy(transaction);
      return this.destroy({ transaction });
    }

    async insertV2PoolReserve(reserves, transaction) {
      if (!reserves.reserve0 || !reserves.reserve1)
        return 'Missing reserves';

      const existingReserve = await sequelize.models.V2DexPoolReserve.findOne({
        where: { transactionLogId: this.id }
      });

      if (existingReserve)
        return;

      const receipt = await this.getReceipt({ include: 'transaction' });
      const pairContract = await sequelize.models.Contract.findOne({
        where: {
          workspaceId: this.workspaceId,
          address: this.address
        }
      });
      const v2DexPair = await sequelize.models.V2DexPair.findOne({
        where: { pairContractId: pairContract.id },
        include: [
          { model: sequelize.models.Contract, as: 'token0', attributes: ['id'] },
          { model: sequelize.models.Contract, as: 'token1', attributes: ['id'] }
        ],
      });

      if (!v2DexPair)
        return console.log('Could not find dex pair for contract id', pairContract.id)

      return sequelize.models.V2DexPoolReserve.create({
        v2DexPairId: v2DexPair.id,
        transactionLogId: this.id,
        timestamp: receipt.transaction.timestamp,
        reserve0: reserves.reserve0,
        reserve1: reserves.reserve1,
        token0ContractId: v2DexPair.token0.id,
        token1ContractId: v2DexPair.token1.id
      }, { transaction });
    }
  }
  TransactionLog.init({
    workspaceId: DataTypes.INTEGER,
    transactionReceiptId: DataTypes.INTEGER,
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    data: DataTypes.STRING,
    logIndex: DataTypes.INTEGER,
    topics: DataTypes.ARRAY(DataTypes.STRING),
    transactionHash: DataTypes.STRING,
    transactionIndex: DataTypes.INTEGER,
    raw: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'TransactionLog',
    tableName: 'transaction_logs',
    hooks: {
      async afterCreate(log, options) {
        try {
          const { Workspace, OrbitChainConfig } = sequelize.models;
          const parentWs = await Workspace.findByPk(log.workspaceId, { attributes: ['id', 'chainFamily'] });
          if (!parentWs || parentWs.chainFamily !== 'ARBITRUM') return;

          // Filter for SequencerBatchDelivered by topic0
          const SEQUENCER_INBOX_ABI = [
            'event SequencerBatchDelivered(uint256 indexed batchSequenceNumber, bytes32 indexed beforeAcc, bytes32 indexed afterAcc, bytes32 delayedAcc, uint256 afterDelayedMessagesRead, tuple(uint64 minTimestamp, uint64 maxTimestamp, uint64 minBlockNumber, uint64 maxBlockNumber) timeBounds, uint8 dataLocation, bytes data)'
          ];
          const { ethers } = require('ethers');
          const iface = new ethers.utils.Interface(SEQUENCER_INBOX_ABI);
          const eventFragment = iface.getEvent('SequencerBatchDelivered');
          const topic0 = iface.getEventTopic(eventFragment);

          if (!Array.isArray(log.topics) || log.topics.length === 0 || log.topics[0] !== topic0) return;

          // Find all orbit workspaces that depend on this parent workspace and target this sequencer inbox address
          const orbitConfigs = await OrbitChainConfig.findAll({
            where: {
              parentWorkspaceId: log.workspaceId,
              [Op.and]: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('sequencerInboxContract')),
                Op.eq,
                log.address
              )
            },
            attributes: ['workspaceId']
          });
          if (!orbitConfigs.length) return;

          const { enqueueBatchDiscovery } = require('../lib/orbitBatchQueue');
          // Rate-limit via queue manager
          await Promise.all(orbitConfigs.map(cfg => enqueueBatchDiscovery(cfg.workspaceId, { reason: 'parent-log', priority: 3, maxAge: 30000 })));
        } catch (_) {}
      }
    }
  });
  return TransactionLog;
};