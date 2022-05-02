'use strict';
const {
  Model
} = require('sequelize');
const { sanitize } = require('../lib/utils');
const INTEGRATION_FIELD_MAPPING = {
    'api': 'apiEnabled',
    'alchemy': 'alchemyIntegrationEnabled'
};

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      Workspace.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Workspace.hasMany(models.Block, { foreignKey: 'workspaceId', as: 'blocks' });
      Workspace.hasMany(models.Transaction, { foreignKey: 'workspaceId', as: 'transactions' });
      Workspace.hasMany(models.TransactionReceipt, { foreignKey: 'workspaceId', as: 'receipts' });
      Workspace.hasMany(models.TransactionLog, { foreignKey: 'workspaceId', as: 'logs' });
      Workspace.hasMany(models.Contract, { foreignKey: 'workspaceId', as: 'contracts' });
    }

    static findByUserIdAndName(userId, name) {
        return Workspace.findOne({
            where: {
                userId: userId,
                name: name
            }
        });
    }

    async safeCreateBlock(block) {
        return await this.createBlock(sanitize({
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
        }));
    }

    async safeCreateTransaction(transaction, blockId) {
        try {
            return await sequelize.transaction(async (sequelizeTransaction) => {
                const storedTx = await this.createTransaction(sanitize({
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
                }));

                const receipt = transaction.receipt;
                const storedReceipt = await storedTx.createReceipt(sanitize({
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
                }));

                for (let i = 0; i < receipt.logs.length; i++) {
                    const log = receipt.logs[i];
                    await storedReceipt.createLog(sanitize({
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
                    }));
                }

                return storedTx;
            });
        } catch(error) {
            console.log(error);
        }
    }

    async safeCreateOrUpdateContract(contract) {
        const contracts = await this.getContracts({ where: { address: contract.address }});
        const existingContract = contracts[0];
        const newContract = sanitize({
            hashedBytecode: contract.hashedBytecode,
            abi: contract.abi,
            address: contract.address,
            name: contract.name,
            patterns: contract.patterns,
            processed: contract.processed,
            timestamp: contract.timestamp,
            tokenDecimals: contract.token && contract.token.decimals,
            tokenName: contract.token && contract.token.name,
            tokenSymbol: contract.token && contract.token.symbol,
            watchedPaths: contract.watchedPaths
        });

        if (existingContract)
            return existingContract.update(newContract)
        else
            return this.createContract(newContract);
    }

    async findTransaction(hash) {
        const transactions = await this.getTransactions({
            where: {
                hash: hash
            }
        });
        return transactions[0];
    }

    async findBlockByNumber(number) {
        const blocks = await this.getBlocks({
            where: {
                number: number
            }
        });
        return blocks[0];
    }

    async findContractByAddress(address) {
        const contracts = await this.getContracts({
            where: {
                address: address
            }
        });
        return contracts[0];
    }

    async findContractByHashedBytecode(hashedBytecode) {
        const contracts = await this.getContracts({
            where: {
                hashedBytecode: hashedBytecode
            }
        });
        return contracts[0];
    }

    addIntegration(integration) {
        if (!INTEGRATION_FIELD_MAPPING[integration])
            throw '[workspace.addIntegration] Unknown integration';

        return this.update({
            [INTEGRATION_FIELD_MAPPING[integration]]: true
        });
    }

    removeIntegration(integration) {
        if (!INTEGRATION_FIELD_MAPPING[integration])
            throw '[workspace.removeIntegration] Unknown integration';

        return this.update({
            [INTEGRATION_FIELD_MAPPING[integration]]: false
        });
    }

    updateSettings(data) {
        return this.update(sanitize({
            chain: data.chain,
            rpcServer: data.rpcServer,
            tracing: data.advancedOptions && data.advancedOptions.tracing,
            defaultAccount: data.settings && data.settings.defaultAccount,
            gasLimit: data.settings && data.settings.gasLimit,
            gasPrice: data.settings && data.settings.gasPrice
        }));
    }

    async reset() {
        await sequelize.models.Block.destroy({ where: { workspaceId: this.id }});
        await sequelize.models.Contract.destroy({ where: { workspaceId: this.id }});
    }

    async removeContractByAddress(address) {
        const contracts = await this.getContracts({ where: { address: address }});
        if (!contracts.length)
            throw `Couldn't find contract at ${address}`;
        return contracts[0].destroy();
    }

    getUnprocessedContracts() {
        return this.getContracts({
            where: {
                processed: false
            }
        });
    }
  }

  Workspace.init({
    name: DataTypes.STRING,
    chain: DataTypes.STRING,
    networkId: DataTypes.STRING,
    public: DataTypes.BOOLEAN,
    rpcServer: DataTypes.STRING,
    defaultAccount: DataTypes.STRING,
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    apiEnabled: DataTypes.BOOLEAN,
    tracing: DataTypes.STRING,
    alchemyIntegrationEnabled: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Workspace',
    tableName: 'workspaces'
  });
  return Workspace;
};