'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      Workspace.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Workspace.hasMany(models.Block, { foreignKey: 'workspaceId', as: 'blocks' });
      Workspace.hasMany(models.Transaction, { foreignKey: 'workspaceId', as: 'transactions' });
      Workspace.hasMany(models.TransactionReceipt, { foreignKey: 'workspaceId', as: 'receipts' });
      Workspace.hasMany(models.TransactionLog, { foreignKey: 'workspaceId', as: 'logs' });
    }

    static findByUserIdAndName(userId, name) {
        return Workspace.findOne({
            where: {
                userId: userId,
                name: name
            }
        });
    }

    safeCreateBlock(block) {
        return this.createBlock({
            baseFeePerGas: block.baseFeePerGas,
            difficulty: block.difficulty,
            extraData: block.extraData,
            gasLimit: block.gasLimit,
            gasUsed: block.gasUsed,
            hash: block.hash,
            miner: block.miner,
            nonce: block.nonce,
            number: block.number,
            parentHash: block.parentHash,
            timestamp: block.timestamp,
            transactionsCount: block.transactions ? block.transactions.length : 0,
            raw: block
        });
    }

    async safeCreateTransaction(transaction, blockId) {
        const sequelizeTransaction = await sequelize.transaction();

        try {
            const storedTx = await this.createTransaction({
                blockHash: transaction.blockHash,
                blockNumber: transaction.blockNumber,
                blockId: blockId,
                chainId: transaction.chainId,
                confirmations: transaction.confirmations,
                data: transaction.data,
                parsedError: transaction.parsedError,
                rawError: transaction.rawError,
                from: transaction.from,
                gasLimit: transaction.gasLimit,
                gasPrice: transaction.gasPrice,
                hash: transaction.hash,
                methodLabel: transaction.methodLabel,
                methodName: transaction.methodName,
                methodSignature: transaction.methodSignature,
                nonce: transaction.nonce,
                r: transaction.r,
                s: transaction.s,
                timestamp: transaction.timestamp,
                to: transaction.to,
                transactionIndex: transaction.transactionIndex,
                type_: transaction.type,
                v: transaction.v,
                value: transaction.value,
                raw: transaction
            }, { transaction: sequelizeTransaction });

            const receipt = transaction.receipt;
            const storedReceipt = await storedTx.createReceipt({
                workspaceId: storedTx.workspaceId,
                blockHash: receipt.blockHash,
                blockNumber: receipt.blockNumber,
                byzantium: receipt.byzantium,
                confirmations: receipt.confirmations,
                cumulativeGasUsed: receipt.cumulativeGasUsed,
                from: receipt.from,
                gasUsed: receipt.gasUsed,
                logsBloom: receipt.logsBloom,
                status: receipt.status,
                to: receipt.to,
                transactionHash: receipt.transactionHash,
                transactionIndex: receipt.transactionIndex,
                type_: receipt.type,
                raw: receipt
            }, { transaction: sequelizeTransaction });

            for (let i = 0; i < receipt.logs.length; i++) {
                const log = receipt.logs[i];
                await storedReceipt.createLog({
                    workspaceId: storedTx.workspaceId,
                    address: log.address,
                    blockHash: log.blockHash,
                    blockNumber: log.blockNumber,
                    data: log.data,
                    logIndex: log.logIndex,
                    topics: log.topics,
                    transactionHash: log.transactionHash,
                    transactionIndex: log.transactionIndex,
                    raw: log
                }, { transaction: sequelizeTransaction });
            }

            return await sequelizeTransaction.commit();
        } catch(error) {
            console.log(error);
            await sequelizeTransaction.rollback();
        }
    }
  }

  Workspace.init({
    name: DataTypes.STRING,
    chain: DataTypes.STRING,
    networkId: DataTypes.INTEGER,
    public: DataTypes.BOOLEAN,
    rpcServer: DataTypes.STRING,
    defaultAccount: DataTypes.STRING,
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    apiEnabled: DataTypes.BOOLEAN,
    alchemyIntegrationEnabled: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Workspace',
    tableName: 'workspaces'
  });
  return Workspace;
};