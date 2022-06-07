'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const { sanitize } = require('../lib/utils');

const Op = Sequelize.Op;
const INTEGRATION_FIELD_MAPPING = {
    'api': 'apiEnabled',
    'alchemy': 'alchemyIntegrationEnabled'
};

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      Workspace.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Workspace.hasOne(models.Explorer, { foreignKey: 'workspaceId', as: 'explorer' });
      Workspace.hasMany(models.Block, { foreignKey: 'workspaceId', as: 'blocks' });
      Workspace.hasMany(models.Transaction, { foreignKey: 'workspaceId', as: 'transactions' });
      Workspace.hasMany(models.TransactionReceipt, { foreignKey: 'workspaceId', as: 'receipts' });
      Workspace.hasMany(models.TransactionLog, { foreignKey: 'workspaceId', as: 'logs' });
      Workspace.hasMany(models.Contract, { foreignKey: 'workspaceId', as: 'contracts' });
      Workspace.hasMany(models.Account, { foreignKey: 'workspaceId', as: 'accounts' });
    }

    static findPublicWorkspaceById(id) {
        return Workspace.findOne({
            where: {
                public: true,
                id: id
            }
        });
    }

    static findByUserIdAndName(userId, name) {
        return Workspace.findOne({
            where: {
                userId: userId,
                name: name
            }
        });
    }

    getFilteredAccounts(page = 1, itemsPerPage = 10, orderBy = 'address', order = 'DESC') {
        return this.getAccounts({
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['workspaceId', 'address', 'balance', 'privateKey']
        });
    }

    getFilteredContracts(page = 1, itemsPerPage = 10, orderBy = 'timestamp', order = 'DESC', onlyTokens = false) {
        const where = onlyTokens ? { patterns: { [Op.contains]: ["erc20"] } } : {};

        return this.getContracts({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['address', 'name', 'timestamp', 'patterns', 'workspaceId', 'tokenName', 'tokenSymbol']
        });
    }

    getFilteredBlocks(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'number') {
        return this.getBlocks({
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });
    }

    getFilteredTransactions(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber', address) {
        const where = address ? { [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }] } : {};
        return this.getTransactions({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId'],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status'],
                    as: 'receipt'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi'],
                    as: 'contract'
                }
            ]
        });
    }

    safeCreateBlock(block) {
        return this.createBlock(sanitize({
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
            return sequelize.transaction(async (sequelizeTransaction) => {
                const storedTx = await this.createTransaction(sanitize({
                    blockHash: transaction.blockHash,
                    blockNumber: transaction.blockNumber,
                    blockId: blockId,
                    chainId: transaction.chainId,
                    confirmations: transaction.confirmations,
                    creates: transaction.creates,
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
                }), { transaction: sequelizeTransaction });

                const receipt = transaction.receipt;
                const storedReceipt = await storedTx.createReceipt(sanitize({
                    workspaceId: storedTx.workspaceId,
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber,
                    byzantium: receipt.byzantium,
                    confirmations: receipt.confirmations,
                    contractAddress: receipt.contractAddress,
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
                }), { transaction: sequelizeTransaction });

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
                    }), { transaction: sequelizeTransaction });
                }

                return storedTx;
            });
        } catch(error) {
            console.log(error);
        }
    }

    async safeCreateOrUpdateContract(contract) {
        const contracts = await this.getContracts({ where: { address: contract.address.toLowerCase() }});
        const existingContract = contracts[0];
        const newContract = sanitize({
            hashedBytecode: contract.hashedBytecode,
            abi: contract.abi,
            address: contract.address,
            name: contract.name,
            imported: contract.imported,
            patterns: contract.patterns,
            processed: contract.processed,
            proxy: contract.proxy,
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

    async safeCreateOrUpdateAccount(account) {
        const accounts = await this.getAccounts({ where: { address: account.address.toLowerCase() }});
        const existingAccount = accounts[0];
        const newAccount = sanitize({
            address: account.address,
            balance: account.balance,
            privateKey: account.privateKey
        });

        if (existingAccount)
            return existingAccount.update(newAccount);
        else
            return this.createAccount(newAccount);
    }

    async findTransaction(hash) {
        const transactions = await this.getTransactions({
            where: {
                hash: hash
            },
            attributes: ['id', 'blockNumber', 'data', 'parsedError', 'rawError', 'from', 'formattedBalanceChanges', 'gasLimit', 'gasPrice', 'hash', 'timestamp', 'to', 'value', 'storage', 'workspaceId'],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status'],
                    as: 'receipt',
                    include: [
                        {
                            model: sequelize.models.TransactionLog,
                            attributes: ['address', 'data', 'logIndex', 'topics'],
                            as: 'logs'
                        } 
                    ]
                },
                {
                    model: sequelize.models.TransactionTraceStep,
                    attributes: ['address', 'contractHashedBytecode', 'depth', 'input', 'op', 'returnData', 'workspaceId'],
                    as: 'traceSteps',
                    include: [
                        {
                            model: sequelize.models.Contract,
                            attributes: ['abi', 'address' , 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'verificationStatus', 'workspaceId'],
                            as: 'contract'
                        }
                    ]
                },
                {
                    model: sequelize.models.TokenBalanceChange,
                    attributes: ['token', 'address', 'currentBalance', 'previousBalance', 'diff'],
                    as: 'tokenBalanceChanges'
                },
                {
                    model: sequelize.models.TokenTransfer,
                    attributes: ['amount', 'dst', 'src', 'token'],
                    as: 'tokenTransfers'
                },
                {
                    model: sequelize.models.Block,
                    attributes: ['gasLimit'],
                    as: 'block'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi', 'address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'verificationStatus', 'workspaceId'],
                    as: 'contract'
                }
            ]
        });

        return transactions.length ? transactions[0] :  null;
    }

    async findBlockByNumber(number) {
        const blocks = await this.getBlocks({
            where: {
                number: number
            }
        });
        return blocks[0];
    }

    async findContractById(contractId) {
        const contracts = await this.getContracts({
            where: {
                id: contractId
            }
        });
        return contracts[0]
    }

    async findContractByAddress(address) {
        const contracts = await this.getContracts({
            where: {
                address: address.toLowerCase()
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
        try {
            return sequelize.transaction(async (transaction) => {
                await sequelize.models.Transaction.destroy({ where: { workspaceId: this.id }}, { transaction });
                await sequelize.models.Block.destroy({ where: { workspaceId: this.id }}, { transaction });
                await sequelize.models.Contract.destroy({ where: { workspaceId: this.id }}, { transaction });
            });
        } catch(error) {
            console.log(error);
        }
    }

    async removeContractByAddress(address) {
        const contracts = await this.getContracts({ where: { address: address.toLowerCase() }});
        if (contracts.length)
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