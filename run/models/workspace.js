'use strict';
const {
  Model,
  Sequelize,
  QueryTypes,
} = require('sequelize');
const { sanitize, slugify } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const { ProviderConnector } = require('../lib/rpc');
const logger = require('../lib/logger');

const Op = Sequelize.Op;
const INTEGRATION_FIELD_MAPPING = {
    'alchemy': 'alchemyIntegrationEnabled'
};

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      Workspace.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Workspace.hasOne(models.Explorer, { foreignKey: 'workspaceId', as: 'explorer' });
      Workspace.hasOne(models.IntegrityCheck, { foreignKey: 'workspaceId', as: 'integrityCheck' });
      Workspace.hasOne(models.RpcHealthCheck, { foreignKey: 'workspaceId', as: 'rpcHealthCheck' });
      Workspace.hasMany(models.CustomField, { foreignKey: 'workspaceId', as: 'custom_fields' });
      Workspace.hasMany(models.Block, { foreignKey: 'workspaceId', as: 'blocks' });
      Workspace.hasMany(models.Transaction, { foreignKey: 'workspaceId', as: 'transactions' });
      Workspace.hasMany(models.TransactionReceipt, { foreignKey: 'workspaceId', as: 'receipts' });
      Workspace.hasMany(models.TransactionLog, { foreignKey: 'workspaceId', as: 'logs' });
      Workspace.hasMany(models.Contract, { foreignKey: 'workspaceId', as: 'contracts' });
      Workspace.hasMany(models.Account, { foreignKey: 'workspaceId', as: 'accounts' });
      Workspace.hasMany(models.TokenBalanceChange, { foreignKey: 'workspaceId', as: 'tokenBalanceChanges' });
      Workspace.hasMany(models.TokenTransfer, { foreignKey: 'workspaceId', as: 'tokenTransfers' });
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

    getProvider() {
        return new ProviderConnector(this.rpcServer);
    }

    async getContractByAddress(address) {
        if (!address) throw new Error('Missing parameter');

        const contracts = await this.getContracts({
            where: { address }
        });

        return contracts[0];
    }

    findBlockGaps(lowerBound, upperBound) {
        if (lowerBound === undefined || lowerBound === null || upperBound === undefined || upperBound === null)
            throw new Error('Missing parameter');

        return sequelize.query(`
            SELECT * FROM (
                SELECT
                    LAG(MAX("number")) OVER (order by group_id) + 1 AS "blockStart",
                    MIN("number") - 1 AS "blockEnd"
                FROM (  
                    SELECT
                        "workspaceId", "number",
                        "number" - row_number() OVER (ORDER BY "number") as group_id
                    FROM blocks
                    WHERE "workspaceId" = :workspaceId
                    AND number >= :lowerBound
                    AND number <= :upperBound
                ) s
                GROUP BY group_id
            ) q
            WHERE "blockStart" IS NOT NULL;
        `, {
            replacements: {
                workspaceId: this.id,
                lowerBound: lowerBound,
                upperBound: upperBound
            },
            type: QueryTypes.SELECT
        });
    }

    async safeCreateOrUpdateRpcHealthCheck(isReachable) {
        if (isReachable === null || isReachable === undefined)
            throw new Error('Missing parameter');

        const rpcHealthCheck = await this.getRpcHealthCheck();

        if (rpcHealthCheck) {
            // This is necessary otherwise Sequelize won't update the value with no other changes
            rpcHealthCheck.changed('updatedAt', true);
            return rpcHealthCheck.update({ isReachable, updatedAt: new Date() });
        }
        else
            return this.createRpcHealthCheck({ isReachable });
    }

    async safeCreateOrUpdateIntegrityCheck({ blockId, status }) {
        if (!blockId && !status) throw new Error('Missing parameter');

        const integrityCheck = await this.getIntegrityCheck();

        if (integrityCheck)
            return integrityCheck.update(sanitize({ blockId, status }));
        else
            return this.createIntegrityCheck(sanitize({ blockId, status }));
    }

    async getCustomTransactionFunction() {
       const custom_field = await sequelize.models.CustomField.findOne({
           where: {
               workspaceId: this.id,
               location: 'transaction'
           }
       });

       return custom_field ? custom_field.function : null;
    }

    getFilteredAddressTokenTransfers(address, page = 1, itemsPerPage = 10, orderBy = 'id', order = 'DESC') {
        if (!address) throw new Error('Missing parameter');

        let sanitizedOrderBy;
        switch(orderBy) {
            case 'timestamp':
            case 'transactionHash':
            case 'blockNumber':
                sanitizedOrderBy = ['transaction', orderBy];
                break;
            case 'amount':
                sanitizedOrderBy = [sequelize.cast(sequelize.col('"TokenTransfer".amount'), 'numeric')];
                break;
            default:
                sanitizedOrderBy = [orderBy];
                break;
        }

        return this.getTokenTransfers({
            where: {
                [Op.or]: [
                    { src: address.toLowerCase() },
                    { dst: address.toLowerCase() }
                ]
            },
            include: [
                {
                    model: sequelize.models.Transaction,
                    as: 'transaction',
                    attributes: ['hash', 'blockNumber', 'timestamp']
                },
                {
                    model: sequelize.models.Contract,
                    as: 'contract',
                    attributes: ['id', 'patterns', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'abi']
                }
            ],
            attributes: ['id', 'src', 'dst', 'token', [sequelize.cast(sequelize.col('"TokenTransfer".amount'), 'numeric'), 'amount']],
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[...sanitizedOrderBy, order]]
        })
    }

    countAddressTokenTransfers(address) {
        if (!address) throw new Error('Missing parameter');

        return this.countTokenTransfers({
            where: {
                [Op.or]: [
                    { src: address.toLowerCase() },
                    { dst: address.toLowerCase() }
                ]
            }
        });
    }

    countAddressSentTransactions(address) {
        if (!address) throw new Error('Missing parameter');

        return this.countTransactions({
            where: { from: address.toLowerCase() }
        });
    }

    countAddressReceivedTransactions(address) {
        if (!address) throw new Error('Missing parameter');

        return this.countTransactions({
            where: { to: address.toLowerCase() }
        });
    }

    countAddressSentErc20TokenTransfers(address) {
        if (!address) throw new Error('Missing parameter');

        return this.countTokenTransfers({
            where: {
                src: address.toLowerCase(),
                tokenId: null
            }
        });
    }

    countAddressReceivedErc20TokenTransfers(address) {
        if (!address) throw new Error('Missing parameter');

        return this.countTokenTransfers({
            where: {
                dst: address.toLowerCase(),
                tokenId: null
            }
        });
    }

    async getTransactionVolume() {
        const [transactions,] = await sequelize.query(`
            SELECT timestamp, count
            FROM transaction_volume_14d 
            WHERE "workspaceId" = :workspaceId
            ORDER BY timestamp ASC
        `, {
            replacements: { workspaceId: this.id }
        });

        return transactions;
    }

    async findActiveWallets() {
        const [wallets,] = await sequelize.query(`
            SELECT DISTINCT "from" AS address 
            FROM transactions
            WHERE "workspaceId" = :workspaceId
        `, {
            replacements: { workspaceId: this.id }
        });
        return wallets;
    }

    async getWalletVolume() {
        const [wallets,] = await sequelize.query(`
            SELECT timestamp, count
            FROM wallet_volume_14d
            WHERE "workspaceId" = :workspaceId
            ORDER BY timestamp
        `, {
            replacements: { workspaceId: this.id }
        });
        return wallets;
    }

    async safeFindLatestTokenBalances(address, tokenPatterns = []) {
        if (!address) return [];

        const allowedTokenPatterns = tokenPatterns.filter(p => ['erc20', 'erc721'].indexOf(p) > -1);

        let tokenFilter = {
            [Op.and]: sequelize.where(
                sequelize.col("tokenContract.workspaceId"),
                Op.eq,
                sequelize.col("TokenBalanceChange.workspaceId")
            ),
            [Op.and]: sequelize.where(
                sequelize.col("tokenContract.address"),
                Op.eq,
                sequelize.col("TokenBalanceChange.token")
            )
        };

        if (allowedTokenPatterns.length) {
            tokenFilter = { patterns: { [Op.contains]: allowedTokenPatterns }, ...tokenFilter };
        }

        const tokenBalanceChanges = await this.getTokenBalanceChanges({
            where: {
                address: address.toLowerCase()
            },
            order: [['token'], ['transaction', 'blockNumber', 'DESC']],
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['name', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'address', 'workspaceId'],
                    as: 'tokenContract',
                    where: tokenFilter,
                    required: !!allowedTokenPatterns.length
                },
                {
                    model: sequelize.models.Transaction,
                    attributes: ['blockNumber'],
                    as: 'transaction'
                }
            ]
        });

        const result = {};
        tokenBalanceChanges.forEach(item => {
            if (!result[item.token] || result[item.token] && item.blockNumber > result[item.token].blockNumber)
                result[item.token] = item.toJSON();
        });

        return Object.values(result);
    }

    getFilteredAccounts(page = 1, itemsPerPage = 10, orderBy = 'address', order = 'DESC') {
        if (page == -1)
            return this.getAccounts({
                order: [[orderBy, order]],
                attributes: ['workspaceId', 'address', 'balance', 'privateKey']
            });
        else
            return this.getAccounts({
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage,
                order: [[orderBy, order]],
                attributes: ['workspaceId', 'address', 'balance', 'privateKey']
            });
    }

    getFilteredContracts(page = 1, itemsPerPage = 10, orderBy = 'timestamp', order = 'DESC', pattern = null) {
        const allowedPattern = ['erc20', 'erc721'].indexOf(pattern) > -1 ? pattern : null;
        const where = allowedPattern ? { patterns: { [Op.contains]: [allowedPattern] } } : {};

        return this.getContracts({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['address', 'name', 'timestamp', 'patterns', 'workspaceId', 'tokenName', 'tokenSymbol', 'tokenTotalSupply']
        });
    }

    getFilteredBlocks(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'number') {
        return this.getBlocks({
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });
    }

    countTransactionsSince(since = 0) {
        return this.countTransactions({
            where: {
                timestamp: { [Op.gte]: since }
            }
        });
    }

    getFilteredTransactions(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber', address) {
        const where = address ? { [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }] } : {};
        return this.getTransactions({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId', 'state'],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'gasUsed', 'cumulativeGasUsed'],
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
                    model: sequelize.models.Contract,
                    attributes: ['abi'],
                    as: 'contract'
                }
            ]
        });
    }

    async canCreateContract() {
        if (this.public)
            return true;

        const user = await this.getUser();
        if (user.isPremium)
            return true;

        const contractCount = await this.countContracts();
        return contractCount < 10;
    }

    async safeCreatePartialBlock(block) {
        return sequelize.transaction(async sequelizeTransaction => {
            const createdBlock = await this.createBlock(sanitize({
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
                state: 'ready',
                raw: block
            }), { transaction: sequelizeTransaction });

            const transactions = block.transactions.map(transaction => {
                return sanitize({
                    blockId: createdBlock.id,
                    workspaceId: this.id,
                    blockHash: transaction.blockHash,
                    blockNumber: transaction.blockNumber,
                    chainId: transaction.chainId,
                    creates: transaction.creates,
                    data: transaction.data || transaction.input,
                    parsedError: transaction.parsedError,
                    rawError: transaction.rawError,
                    from: transaction.from,
                    gasLimit: transaction.gasLimit || block.gasLimit,
                    gasPrice: transaction.gasPrice,
                    hash: transaction.hash,
                    methodLabel: transaction.methodLabel,
                    methodName: transaction.methodName,
                    methodSignature: transaction.methodSignature,
                    nonce: transaction.nonce,
                    r: transaction.r,
                    s: transaction.s,
                    timestamp: block.timestamp,
                    to: transaction.to,
                    transactionIndex: transaction.transactionIndex || transaction.index,
                    type_: transaction.type,
                    v: transaction.v,
                    value: transaction.value,
                    state: 'syncing',
                    raw: transaction
                });
            });

            await sequelize.models.Transaction.bulkCreate(transactions, { individualHooks: true, transaction: sequelizeTransaction });

            const blockWithTransactions = await sequelize.models.Block.findByPk(createdBlock.id, {
                include: 'transactions'
            });

            return blockWithTransactions;
        });
    }

    /*
        It's all or nothing, we make sure we synchronize all the block info, ie:
        - Block
        - Transactions
        - Receipt
        - Logs
        It takes longer, but we avoid inconsistencies, such as a block not displaying all transactions
    */
    async safeCreateFullBlock(data) {
        try {
            return await sequelize.transaction(async sequelizeTransaction => {
                const block = data.block;
                const transactions = data.transactions;

                if (block.transactions.length != transactions.length)
                    throw new Error('Missing transactions in block.');

                const [, [storedBlock]] = await sequelize.models.Block.update(
                    { state: 'ready' },
                    {
                        where: {
                            workspaceId: this.id,
                            number: block.number
                        },
                        individualHooks: true,
                        returning: true,
                        transaction: sequelizeTransaction
                    }
                );

                for (let i = 0; i < transactions.length; i++) {
                    const transaction = transactions[i];
                    const [, [storedTx]] = await sequelize.models.Transaction.update(
                        { state: 'ready' },
                        {
                            where: {
                                workspaceId: this.id,
                                hash: transaction.hash
                            },
                            individualHooks: true,
                            returning: true,
                            transaction: sequelizeTransaction
                        }
                    );

                    const receipt = transaction.receipt;
                    if (!receipt)
                        throw new Error('Missing transaction receipt.');

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
                        transactionHash: receipt.transactionHash || receipt.hash || storedTx.hash,
                        transactionIndex: receipt.transactionIndex || receipt.index,
                        type: receipt.type,
                        raw: receipt
                    }), { transaction: sequelizeTransaction });

                    for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        try {
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
                        } catch(error) {
                            logger.error(error.message, { location: 'models.workspaces.safeCreateFullBlock', error: error, data });
                            await storedReceipt.createLog(sanitize({
                                workspaceId: storedTx.workspaceId,
                                raw: log
                            }), { transaction: sequelizeTransaction });
                        }
                    }

                    const explorers = await sequelize.models.Explorer.findAll({
                        where: { workspaceId: this.id }
                    });

                    for (let j = 0; j < explorers.length; j++) {
                        const explorer = explorers[j];
                        const stripeSubscription = await explorer.getStripeSubscription();
                        if (stripeSubscription)
                            await stripeSubscription.increment('transactionQuota', { transaction: sequelizeTransaction });
                    }
                }

                return storedBlock;
            });
        } catch(error) {
            await this.safeDestroyPartialBlock(data.block.number);
            throw error;
        }
    }

    async safeDestroyPartialBlock(blockNumber) {
        const [block] = await this.getBlocks({ where: { workspaceId: this.id, number: blockNumber }});

        // No need to throw an error if the block we are trying to destroy does not exist or is not partial
        if (!block || block.state !== 'syncing') return;

        return block.revertIfPartial();
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
        return sequelize.transaction(async (sequelizeTransaction) => {
            const storedTx = await this.createTransaction(sanitize({
                blockHash: transaction.blockHash,
                blockNumber: transaction.blockNumber,
                blockId: blockId,
                chainId: transaction.chainId,
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
                transactionIndex: transaction.transactionIndex || transaction.index,
                type_: transaction.type,
                v: transaction.v,
                value: transaction.value,
                raw: transaction
            }), { transaction: sequelizeTransaction });

            const receipt = transaction.receipt;
            if (receipt) {
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
                    transactionHash: receipt.transactionHash || receipt.hash || storedTx.hash,
                    transactionIndex: receipt.transactionIndex || receipt.index,
                    type_: receipt.type,
                    raw: receipt
                }), { transaction: sequelizeTransaction });

                for (let i = 0; i < receipt.logs.length; i++) {
                    const log = receipt.logs[i];
                    try {
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
                    } catch(error) {
                        logger.error(error.message, { location: 'models.workspaces.safeCreateTransaction', error: error, transaction: transaction });
                        await storedReceipt.createLog(sanitize({
                            workspaceId: storedTx.workspaceId,
                            raw: log
                        }), { transaction: sequelizeTransaction });
                    }
                }
            }

            return storedTx;
        });
    }

    async safeCreateOrUpdateContract(contract, transaction) {
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
            tokenDecimals: contract.tokenDecimals,
            tokenName: contract.tokenName,
            tokenSymbol: contract.tokenSymbol,
            tokenTotalSupply: contract.tokenTotalSupply,
            watchedPaths: contract.watchedPaths,
            has721Metadata: contract.has721Metadata,
            has721Enumerable: contract.has721Enumerable,
            ast: contract.ast,
            bytecode: contract.bytecode,
            asm: contract.asm
        });

        if (existingContract)
            return existingContract.update(newContract, { transaction })
        else
            return this.createContract(newContract, { transaction });
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

    findContractsByText(text) {
        return this.getContracts({
            attributes: ['id', 'address', 'name', 'tokenName', 'tokenSymbol', 'patterns', 'verificationStatus'],
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${text}%` } },
                    { tokenName: { [Op.iLike]: `%${text}%` } },
                    { tokenSymbol: { [Op.iLike]: `%${text}%` } },
                ]
            }
        })
    }

    async findBlockByHash(hash) {
        const blocks = await this.getBlocks({
            where: {
                hash: hash
            }
        });

        return blocks.length ? blocks[0] : null;
    }

    async findTransaction(hash) {
        const transactions = await this.getTransactions({
            where: {
                hash: hash
            },
            attributes: ['id', 'blockNumber', 'data', 'parsedError', 'rawError', 'from', 'formattedBalanceChanges', 'gasLimit', 'gasPrice', 'hash', 'timestamp', 'to', 'value', 'storage', 'workspaceId', 'raw', 'state',
                [Sequelize.literal(`
                    (SELECT COUNT(*)::int
                    FROM token_transfers AS token_transfers
                    WHERE token_transfers."transactionId" = "Transaction".id)
                `), 'tokenTransferCount']
            ],
            order: [
                [sequelize.literal('"traceSteps".'), 'id', 'asc']
            ],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'cumulativeGasUsed', 'raw'],
                    as: 'receipt',
                    include: [
                        {
                            model: sequelize.models.TransactionLog,
                            attributes: ['address', 'data', 'logIndex', 'topics', 'raw'],
                            as: 'logs'
                        }
                    ]
                },
                {
                    model: sequelize.models.TransactionTraceStep,
                    attributes: ['address', 'contractHashedBytecode', 'depth', 'input', 'op', 'returnData', 'workspaceId', 'id', 'value'],
                    as: 'traceSteps',
                    include: [
                        {
                            model: sequelize.models.Contract,
                            attributes: ['abi', 'address' , 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'verificationStatus', 'workspaceId'],
                            include: [
                                {
                                    model: sequelize.models.Contract,
                                    attributes: ['name', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'abi', 'address', 'workspaceId'],
                                    as: 'proxyContract',
                                    where: {
                                        [Op.and]: sequelize.where(
                                            sequelize.col("traceSteps->contract.workspaceId"),
                                            Op.eq,
                                            sequelize.col("traceSteps->contract->proxyContract.workspaceId")
                                        ),
                                    },
                                    required: false
                                }
                            ],
                            as: 'contract'
                        }
                    ]
                },
                {
                    model: sequelize.models.TokenBalanceChange,
                    attributes: ['token', 'address', 'currentBalance', 'previousBalance', 'diff', 'transactionId'],
                    as: 'tokenBalanceChanges'
                },
                {
                    model: sequelize.models.Block,
                    attributes: ['gasLimit', 'timestamp'],
                    as: 'block'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi', 'address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'verificationStatus', 'workspaceId'],
                    as: 'contract'
                }
            ]
        });

        return transactions.length ? transactions[0] : null;
    }

    async findBlockByNumber(number, withTransactions = false) {
        const include = withTransactions ? [{
            model: sequelize.models.Transaction,
            attributes: ['id', 'from', 'to', 'hash'],
            as: 'transactions'
        }] : [];
        const blocks = await this.getBlocks({
            where: {
                number: number
            },
            include: include
        });
        return blocks[0];
    }

    async findContractById(contractId) {
        const contracts = await this.getContracts({
            where: {
                id: contractId
            }
        });
        return contracts[0];
    }

    async findContractByAddress(address) {
        const contracts = await this.getContracts({
            where: {
                address: address.toLowerCase()
            },
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['name', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'abi', 'address'],
                    as: 'proxyContract',
                    required: false,
                    where: {
                        [Op.and]: sequelize.where(
                            sequelize.col("Contract.workspaceId"),
                            Op.eq,
                            sequelize.col("proxyContract.workspaceId")
                        )
                    }
                },
                {
                    model: sequelize.models.Transaction,
                    attributes: ['blockNumber', 'hash'],
                    as: 'creationTransaction',
                },
                {
                    model: sequelize.models.ContractVerification,
                    as: 'verification',
                    include: [
                        {
                            model: sequelize.models.ContractSource,
                            as: 'sources'
                        }
                    ]
                }
            ]
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
            statusPageEnabled: data.statusPageEnabled,
            chain: data.chain,
            rpcServer: data.rpcServer,
            tracing: data.advancedOptions && data.advancedOptions.tracing,
            defaultAccount: data.settings && data.settings.defaultAccount,
            gasLimit: data.settings && data.settings.gasLimit,
            gasPrice: data.settings && data.settings.gasPrice
        }));
    }

    async reset(dayInterval) {
        const filter = { where: { workspaceId: this.id }};
        if (dayInterval)
            filter['where']['createdAt'] = { [Op.lt]: sequelize.literal(`NOW() - interval '${dayInterval} day'`)};

        return sequelize.transaction(
            { deferrable: Sequelize.Deferrable.SET_DEFERRED },
            async (transaction) => {
                await sequelize.models.IntegrityCheck.destroy(filter, { transaction });
                await sequelize.models.TokenBalanceChange.destroy(filter, { transaction });
                await sequelize.models.TokenTransfer.destroy(filter, { transaction });
                await sequelize.models.Transaction.destroy(filter, { transaction });
                await sequelize.models.Block.destroy(filter, { transaction });
                await sequelize.models.Contract.destroy(filter, { transaction });
                await sequelize.models.Account.destroy(filter, { transaction });
            }
        );
    }

    async removeContractByAddress(address) {
        const contracts = await this.getContracts({ where: { address: address.toLowerCase() }});
        if (contracts.length)
            return contracts[0].destroy();
    }

    getUnprocessedContracts() {
        return this.getContracts({
            attributes: ['address', 'abi'],
            where: {
                processed: false
            }
        });
    }

    getFailedProcessableTransactions() {
        return this.getTransactions({
            attributes: ['hash', 'workspaceId', 'rawError', 'parsedError', 'to', 'data', 'blockNumber'],
            where: {
                [Op.and]: [
                    { parsedError: null },
                    { rawError: null },
                    { '$receipt.status$': false }
                ]
            },
            include: [
                {
                    model: sequelize.models.Workspace,
                    as: 'workspace',
                    attributes: ['id', 'public']
                },
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['status'],
                    as: 'receipt'
                }
            ]
        });
    }

    getProcessableTransactions() {
        const tokenTransferCount = `(
            SELECT COUNT(*)
            FROM "token_transfers"
            WHERE
                "token_transfers"."transactionId" = "Transaction"."id"
        )`;
        const tokenBalanceChangeCount = `(
            SELECT COUNT(*)
            FROM "token_balance_changes"
            WHERE
                "token_balance_changes"."transactionId" = "Transaction"."id"
        )`;

        return this.getTransactions({
            attributes: ['blockNumber', 'hash'],
            include: [
                {
                    model: sequelize.models.TokenTransfer,
                    attributes: ['id', 'src', 'dst', 'token'],
                    as: 'tokenTransfers'
                },
            ],
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.literal(tokenTransferCount), { [Op.gt]: 0 }
                    ),
                    sequelize.where(
                        sequelize.literal(tokenBalanceChangeCount), { [Op.eq]: 0 }
                    )
                ]
            },
        })
    }

    async safeCreateExplorer() {
        return sequelize.transaction(async (transaction) => {
            if (!this.public)
                await this.update({ public: true, browserSyncEnabled: false }, { transaction });

            const existingExplorer = await sequelize.models.Explorer.findOne({ where: { slug: slugify(this.name) }});
            const slug = existingExplorer ?
                `${slugify(this.name)}-${Math.floor(Math.random() * 100)}` :
                slugify(this.name);

            return this.createExplorer({
                userId: this.userId,
                chainId: this.networkId,
                name: this.name,
                rpcServer: this.rpcServer,
                slug: slug,
                themes: { "default": {}},
                domain: `${slug}.${process.env.APP_DOMAIN}`
            });
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
    tracing: DataTypes.STRING,
    alchemyIntegrationEnabled: DataTypes.BOOLEAN,
    isRemote: DataTypes.BOOLEAN,
    dataRetentionLimit: DataTypes.INTEGER,
    storageEnabled: DataTypes.BOOLEAN,
    erc721LoadingEnabled: DataTypes.BOOLEAN,
    browserSyncEnabled: DataTypes.BOOLEAN,
    rpcHealthCheckEnabled: DataTypes.BOOLEAN,
    statusPageEnabled: DataTypes.BOOLEAN,
    integrityCheckStartBlockNumber: {
        type: DataTypes.INTEGER,
        get() {
            return Math.max(this.getDataValue('integrityCheckStartBlockNumber'), 0);
        }
    }
  }, {
    hooks: {
        afterSave(workspace, options) {
            return enqueue('processWorkspace', `processWorkspace-${workspace.id}-${workspace.name}`, {
                workspaceId: workspace.id,
            });
        },
        afterUpdate(workspace, options) {
            return enqueue('processWorkspace', `processWorkspace-${workspace.id}-${workspace.name}`, {
                workspaceId: workspace.id,
            });
        }
    },
    sequelize,
    modelName: 'Workspace',
    tableName: 'workspaces'
  });
  return Workspace;
};