/**
 * @fileoverview Database access layer for API endpoints.
 * Provides methods to interact with Sequelize models from the API.
 * Handles parameter validation, resource access control, and user authorization.
 *
 * APIs should use methods from this file and not interact with models directly.
 * Background jobs can interact with models directly as they are not user-exposed.
 *
 * @module lib/firebase
 */
const Sequelize = require('sequelize');
const { getDemoUserId, getMaxBlockForSyncReset } = require('./env');
const models = require('../models');
const { firebaseHash }  = require('./crypto');
const { ORBIT_L2_TO_L1_LOG_TOPIC } = require('../constants/orbit');

const Op = Sequelize.Op;
const User = models.User;
const TokenTransfer = models.TokenTransfer;
const Transaction = models.Transaction;
const Workspace = models.Workspace;
const TransactionReceipt = models.TransactionReceipt;
const Explorer = models.Explorer;
const Contract = models.Contract;
const ContractVerification = models.ContractVerification;
const Block = models.Block;
const StripeSubscription = models.StripeSubscription;
const StripePlan = models.StripePlan;
const ExplorerDomain = models.ExplorerDomain;
const RpcHealthCheck = models.RpcHealthCheck;
const StripeQuotaExtension = models.StripeQuotaExtension;
const ExplorerFaucet = models.ExplorerFaucet;
const ExplorerV2Dex = models.ExplorerV2Dex;
const V2DexPair = models.V2DexPair;
const OrbitBatch = models.OrbitBatch;
const OrbitChainConfig = models.OrbitChainConfig;
const OrbitWithdrawal = models.OrbitWithdrawal;
const OrbitDeposit = models.OrbitDeposit;
const OpBatch = models.OpBatch;
const OpChainConfig = models.OpChainConfig;
const OpOutput = models.OpOutput;
const OpDeposit = models.OpDeposit;
const OpWithdrawal = models.OpWithdrawal;

/**
 * Creates an orbit config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @param {Object} params - The parameters to create
 * @returns {Promise<Object>} - The created orbit config
 */
const createOrbitConfig = async (userId, explorerId, params) => {
    if (!userId || !explorerId || !params)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$workspace.userId$': userId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: OrbitChainConfig,
                as: 'orbitConfig'
            }
        }
    });

    if (!explorer)
        throw new Error('Could not find explorer');

    if (explorer.workspace.orbitConfig)
        throw new Error('Orbit config already exists');
    
    return explorer.workspace.safeCreateOrbitConfig(params);
}

/**
 * Updates an existing orbit config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @param {Object} params - The parameters to update
 * @returns {Promise<Object>} - The updated orbit config
 */
const updateOrbitConfig = async (userId, explorerId, params) => {
    if (!userId || !explorerId || !params)
        throw new Error('Missing parameter');

    const config = await OrbitChainConfig.findOne({
        where: {
            '$workspace.userId$': userId,
            '$workspace.explorer.id$': explorerId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: Explorer,
                as: 'explorer'
            }
        }
    });

    if (!config)
        throw new Error('Could not find orbit config');

    return config.safeUpdate(params);
};

/**
 * Retrieves an orbit config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @returns {Promise<Object>} - The orbit config
 */
const getOrbitConfig = async (userId, explorerId) => {
    if (!userId || !explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$workspace.userId$': userId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: OrbitChainConfig,
                as: 'orbitConfig'
            }
        }
    });

    if (!explorer || !explorer.workspace.orbitConfig)
        return null

    return explorer.workspace.orbitConfig;
}

/**
 * Creates an OP Stack config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @param {Object} params - The parameters to create
 * @returns {Promise<Object>} - The created OP config
 */
const createOpConfig = async (userId, explorerId, params) => {
    if (!userId || !explorerId || !params)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$workspace.userId$': userId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: OpChainConfig,
                as: 'opConfig'
            }
        }
    });

    if (!explorer)
        throw new Error('Could not find explorer');

    if (explorer.workspace.opConfig)
        throw new Error('OP config already exists');

    return explorer.workspace.safeCreateOpConfig(params);
}

/**
 * Updates an existing OP Stack config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @param {Object} params - The parameters to update
 * @returns {Promise<Object>} - The updated OP config
 */
const updateOpConfig = async (userId, explorerId, params) => {
    if (!userId || !explorerId || !params)
        throw new Error('Missing parameter');

    const config = await OpChainConfig.findOne({
        where: {
            '$workspace.userId$': userId,
            '$workspace.explorer.id$': explorerId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: Explorer,
                as: 'explorer'
            }
        }
    });

    if (!config)
        throw new Error('Could not find OP config');

    return config.safeUpdate(params);
};

/**
 * Retrieves an OP Stack config for an explorer
 * @param {string} userId - The user id
 * @param {string} explorerId - The explorer id
 * @returns {Promise<Object>} - The OP config
 */
const getOpConfig = async (userId, explorerId) => {
    if (!userId || !explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$workspace.userId$': userId
        },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: OpChainConfig,
                as: 'opConfig'
            }
        }
    });

    if (!explorer || !explorer.workspace.opConfig)
        return null

    return explorer.workspace.opConfig;
}

/**
 * Retrieves available L1 parent workspaces for OP Stack configuration
 * @returns {Promise<Array>} - List of available parent workspaces with id, name, and networkId
 */
const getAvailableOpParents = async () => {
    const workspaces = await Workspace.getAvailableTopOpParent();
    return workspaces.map(w => ({
        id: w.id,
        name: w.name,
        networkId: w.networkId
    }));
}

/**
 * Retrieves a list of orbit deposits for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit deposits
 */
const getWorkspaceOrbitDeposits = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');
    
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return OrbitDeposit.findAndCountAll({
        where: { workspaceId },
        order: [['messageIndex', order]],
        limit: parseInt(itemsPerPage),
        offset: (parseInt(page) - 1) * parseInt(itemsPerPage)
    });
}

/**
 * Retrieves the l2 transaction containing an orbit withdrawal
 * Data will be used to build claim calldata
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The hash of the transaction
 * @param {number} messsageNumber - The message number of the withdrawal
 * @returns {Promise<Object>} - The orbit withdrawal
 */
const getL2TransactionForOrbitWithdrawalClaim = async (workspaceId, hash, messsageNumber) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const withdrawal = await OrbitWithdrawal.findOne({
        where: {
            workspaceId,
            l2TransactionHash: hash,
            messageNumber: messsageNumber
        },
        include: [
            {
                model: Transaction,
                as: 'l2Transaction',
                include: [
                    {
                        model: TransactionReceipt,
                        as: 'receipt',
                    },
                    {
                        model: Workspace,
                        as: 'workspace',
                        include: {
                            model: OrbitChainConfig,
                            as: 'orbitConfig',
                            attributes: ['outboxContract', 'parentChainRpcServer', 'parentChainId']
                        }
                    }
                ]
            },
        ]
    });

    const logs = await withdrawal.l2Transaction.receipt.getLogs();

    const log = logs.find(log => log.topics[0] === ORBIT_L2_TO_L1_LOG_TOPIC);

    return { log, transaction: withdrawal.l2Transaction };
};

/**
 * Retrieves an orbit withdrawal l2 transactionfor a workspace
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The hash of the transaction
 * @returns {Promise<Object>} - The orbit withdrawal
 */
const getL2TransactionOrbitWithdrawals = (workspaceId, hash) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    return OrbitWithdrawal.findAndCountAll({
        where: {
            workspaceId,
            l2TransactionHash: hash
        },
        attributes: ['messageNumber', 'status', 'to', 'amount', 'l1TokenAddress', 'tokenSymbol', 'tokenDecimals'],
    });
};

/**
 * Retrieves a list of orbit withdrawals for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit withdrawals
 */
const getWorkspaceOrbitWithdrawals = (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
    return OrbitWithdrawal.findAndCountAll({
        where: {
            workspaceId
        },
        attributes: ['to', 'amount', 'messageNumber', 'status', 'l1TokenAddress', 'tokenSymbol', 'tokenDecimals', 'timestamp', 'from', 'l2TransactionHash', 'l1TransactionHash'],
        order: [['messageNumber', sanitizedOrder]],
        limit: parseInt(itemsPerPage),
        offset: (parseInt(page) - 1) * parseInt(itemsPerPage)
    });
};

/**
 * Retrieves a list of transactions for a specific batch
 * @param {string} workspaceId - The workspace id
 * @param {number} batchNumber - The batch number
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @param {string} orderBy - The field to order by
 * @returns {Promise<Array>} - A list of orbit batch transactions
 */
const getWorkspaceOrbitBatchTransactions = async (workspaceId, batchNumber, page, itemsPerPage, order, orderBy, address) => {
    if (!workspaceId || !batchNumber)
        throw new Error('Missing parameter');
    
    const batch = await OrbitBatch.findOne({
        where: {
            workspaceId,
            batchSequenceNumber: batchNumber
        }
    });
    
    if (!batch)
        throw new Error('Could not find batch');

    const total = await batch.countTransactions();
    const items = await batch.getFilteredTransactions(page, itemsPerPage, order, orderBy, address);

    return {
        total,
        items
    };
};

/**
 * Retrieves a list of blocks for a specific batch
 * @param {string} workspaceId - The workspace id
 * @param {number} batchNumber - The batch number
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit batch blocks
 */
const getOrbitBatchBlocks = async (workspaceId, batchNumber, page, itemsPerPage, order) => {
    if (!workspaceId || !batchNumber)
        throw new Error('Missing parameter');

    const batch = await OrbitBatch.findOne({
        where: {
            workspaceId,
            batchSequenceNumber: batchNumber
        }
    });

    if (!batch)
        throw new Error('Could not find batch');

    return batch.getFilteredBlocks(page, itemsPerPage, order);
};

/**
 * Retrieves an orbit batch by its sequence number for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} batchNumber - The batch number
 * @returns {Promise<Object>} - The orbit batch
 */
const getOrbitBatch = async (workspaceId, batchNumber) => {
    if (!workspaceId || !batchNumber)
        throw new Error('Missing parameter');

    const batch = await OrbitBatch.findOne({
        where: {
            workspaceId,
            batchSequenceNumber: batchNumber
        },
        attributes: [
            'id',
            'batchSequenceNumber',
            'postedAt',
            'confirmationStatus',
            'parentChainBlockNumber',
            'parentChainTxHash',
            'beforeAcc',
            'afterAcc',
            [Sequelize.literal(`
                (
                    SELECT COUNT(t.id)
                    FROM orbit_batches ob
                    JOIN blocks b ON b."orbitBatchId" = ob.id
                    JOIN transactions t ON t."blockId" = b.id
                    WHERE ob."batchSequenceNumber" = ${Number(batchNumber)}
                    AND ob."workspaceId" = ${Number(workspaceId)}
                )::int
            `), 'transactionCount'],
            [Sequelize.literal(`
                (
                    SELECT COUNT(*)
                    FROM orbit_batches ob
                    JOIN blocks b ON b."orbitBatchId" = ob.id
                    WHERE ob."batchSequenceNumber" = ${Number(batchNumber)}
                    AND ob."workspaceId" = ${Number(workspaceId)}
                )::int
            `), 'blockCount']
        ]
    });

    if (!batch)
        throw new Error('Could not find batch');

    return batch.toJSON();
};

/**
 * Retrieves a list of orbit batches for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit batches
 */
const getWorkspaceOrbitBatches = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getFilteredOrbitBatches(page, itemsPerPage, order);
};

// OP Stack Functions

/**
 * Retrieves a list of OP batches for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP batches
 */
const getWorkspaceOpBatches = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
    return OpBatch.findAndCountAll({
        where: { workspaceId },
        order: [['batchIndex', sanitizedOrder]],
        limit: parseInt(itemsPerPage) || 10,
        offset: ((parseInt(page) || 1) - 1) * (parseInt(itemsPerPage) || 10)
    });
};

/**
 * Retrieves an OP batch by its index for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} batchIndex - The batch index
 * @returns {Promise<Object>} - The OP batch
 */
const getOpBatch = async (workspaceId, batchIndex) => {
    if (!workspaceId || batchIndex === undefined)
        throw new Error('Missing parameter');

    const batch = await OpBatch.findOne({
        where: {
            workspaceId,
            batchIndex: parseInt(batchIndex)
        }
    });

    if (!batch)
        throw new Error('Could not find batch');

    return batch.toJSON();
};

/**
 * Retrieves L2 transactions for a specific OP batch
 * @param {string} workspaceId - The workspace id
 * @param {number} batchIndex - The batch index
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Object>} - List of transactions and total count
 */
const getOpBatchTransactions = async (workspaceId, batchIndex, page, itemsPerPage, order) => {
    if (!workspaceId || batchIndex === undefined)
        throw new Error('Missing parameter');

    const batch = await OpBatch.findOne({
        where: {
            workspaceId,
            batchIndex: parseInt(batchIndex)
        }
    });

    if (!batch)
        throw new Error('Could not find batch');

    // If batch has L2 block range, query transactions in that range
    if (batch.l2BlockStart !== null && batch.l2BlockEnd !== null) {
        const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
        const result = await Transaction.findAndCountAll({
            where: {
                workspaceId,
                blockNumber: {
                    [Op.between]: [batch.l2BlockStart, batch.l2BlockEnd]
                }
            },
            order: [['blockNumber', sanitizedOrder], ['transactionIndex', sanitizedOrder]],
            limit: parseInt(itemsPerPage) || 10,
            offset: ((parseInt(page) || 1) - 1) * (parseInt(itemsPerPage) || 10)
        });
        return { total: result.count, items: result.rows };
    }

    // Otherwise return empty result (batch blocks not yet linked)
    return { total: 0, items: [] };
};

/**
 * Retrieves a list of OP outputs for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP outputs
 */
const getWorkspaceOpOutputs = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
    return OpOutput.findAndCountAll({
        where: { workspaceId },
        order: [['outputIndex', sanitizedOrder]],
        limit: parseInt(itemsPerPage) || 10,
        offset: ((parseInt(page) || 1) - 1) * (parseInt(itemsPerPage) || 10)
    });
};

/**
 * Retrieves an OP output by its index for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} outputIndex - The output index
 * @returns {Promise<Object>} - The OP output
 */
const getOpOutput = async (workspaceId, outputIndex) => {
    if (!workspaceId || outputIndex === undefined)
        throw new Error('Missing parameter');

    const output = await OpOutput.findOne({
        where: {
            workspaceId,
            outputIndex: parseInt(outputIndex)
        }
    });

    if (!output)
        throw new Error('Could not find output');

    return output.toJSON();
};

/**
 * Retrieves a list of OP deposits for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP deposits
 */
const getWorkspaceOpDeposits = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
    return OpDeposit.findAndCountAll({
        where: { workspaceId },
        order: [['l1BlockNumber', sanitizedOrder]],
        limit: parseInt(itemsPerPage) || 10,
        offset: ((parseInt(page) || 1) - 1) * (parseInt(itemsPerPage) || 10)
    });
};

/**
 * Retrieves an OP deposit by L1 transaction hash
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The L1 transaction hash
 * @returns {Promise<Object>} - The OP deposit
 */
const getOpDepositByL1Hash = async (workspaceId, hash) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const deposit = await OpDeposit.findOne({
        where: {
            workspaceId,
            l1TransactionHash: hash.toLowerCase()
        }
    });

    if (!deposit)
        throw new Error('Could not find deposit');

    return deposit.toJSON();
};

/**
 * Retrieves a list of OP withdrawals for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of OP withdrawals
 */
const getWorkspaceOpWithdrawals = async (workspaceId, page, itemsPerPage, order) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const sanitizedOrder = order === 'ASC' ? 'ASC' : 'DESC';
    return OpWithdrawal.findAndCountAll({
        where: { workspaceId },
        order: [['l2BlockNumber', sanitizedOrder]],
        limit: parseInt(itemsPerPage) || 10,
        offset: ((parseInt(page) || 1) - 1) * (parseInt(itemsPerPage) || 10)
    });
};

/**
 * Retrieves an OP withdrawal by L2 transaction hash
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The L2 transaction hash
 * @returns {Promise<Object>} - The OP withdrawal
 */
const getOpWithdrawalByL2Hash = async (workspaceId, hash) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const withdrawal = await OpWithdrawal.findOne({
        where: {
            workspaceId,
            l2TransactionHash: hash.toLowerCase()
        }
    });

    if (!withdrawal)
        throw new Error('Could not find withdrawal');

    return withdrawal.toJSON();
};

/**
 * Retrieves proof data for an OP withdrawal (for proving on L1)
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The L2 transaction hash
 * @returns {Promise<Object>} - The withdrawal proof data
 */
const getOpWithdrawalProof = async (workspaceId, hash) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const withdrawal = await OpWithdrawal.findOne({
        where: {
            workspaceId,
            l2TransactionHash: hash.toLowerCase()
        },
        include: [
            {
                model: Transaction,
                as: 'l2Transaction',
                include: [
                    {
                        model: TransactionReceipt,
                        as: 'receipt'
                    }
                ]
            }
        ]
    });

    if (!withdrawal)
        throw new Error('Could not find withdrawal');

    // Return withdrawal data needed for proving
    return {
        withdrawalHash: withdrawal.withdrawalHash,
        nonce: withdrawal.nonce,
        sender: withdrawal.sender,
        target: withdrawal.target,
        value: withdrawal.value,
        gasLimit: withdrawal.gasLimit,
        data: withdrawal.data,
        l2BlockNumber: withdrawal.l2BlockNumber,
        status: withdrawal.status
    };
};

/**
 * Return filtered native token balances of all active addresses (paginated)
 * with share % and transaction count
 * @param {integer} workspaceId 
 * @param {integer} page 
 * @param {integer} itemsPerPage 
 * @returns {Promise<Array>} - A list of native token balances
 */
const getFilteredNativeAccounts = async (workspaceId, page, itemsPerPage) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getFilteredNativeAccounts(page, itemsPerPage);
}

/**
 * Checks if a domain is a registered domain.
 * We use on self hosted instances to check if
 * we can issue a SSL certificate for the domain.
 * @param {string} domain - The domain to check
 * @returns {Promise<boolean>} - True if the domain is registered, false otherwise
 */
const isValidExplorerDomain = async (domain) => {
    const explorerDomain = await ExplorerDomain.findOne({
        where: {
            domain
        }
    });

    return !!explorerDomain;
}

/**
 * Creates an admin user
 * This should only be called on routes that are protected by the self-hosted middleware
 * @param {string} email - The email of the admin user
 * @param {string} password - The password of the admin user
 * @returns {Promise<User>} - The created admin user
 */
const createAdmin = async (email, password) => {
    if (!email || !password)
        throw new Error('Missing parameters');

    return User.createAdmin(email, password);
};

/**
 * Checks if the admin can be setup
 * This should only be called on routes that are protected by the self-hosted middleware
 * This check is to make sure we only create one admin user on self-hosted instances
 * and can't create more later on
 * @returns {Promise<boolean>} - True if the admin can be setup, false otherwise
 */
const canSetupAdmin = async () => {
    const userCount = await User.count();
    return userCount === 0;
}

/**
 * Retrieves a list of token transfers for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} orderBy - The field to order by
 * @param {string} order - The order to sort by
 * @param {Array} tokenTypes - The types of tokens to return
 * @returns {Promise<Array>} - A list of token transfers
 */
const getWorkspaceTokenTransfers = async (workspaceId, page, itemsPerPage, orderBy, order, tokenTypes) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getFilteredTokenTransfers(page, itemsPerPage, orderBy, order, tokenTypes);
};

/**
 * Retrieves the top tokens by holders for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string[]} patterns - Token patterns to filter by (erc20, erc721, erc1155)
 * @returns {Promise<Array>} - A list of top tokens by holders
 */
const getTopTokensByHolders = async (workspaceId, page, itemsPerPage, patterns = ['erc20']) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTopTokensByHolders(page, itemsPerPage, patterns);
};

/**
 * Retrieves contract stats for a workspace
 * @param {string} workspaceId - The workspace id
 * @returns {Promise<Object>} - An object containing the contract stats
 * - totalContracts
 * - contractsLast24Hours
 * - verifiedContracts
 * - verifiedContractsLast24Hours
 */
const getWorkspaceContractStats = async (workspaceId) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getContractStats();
};

/**
 * Retrieves a list of verified contracts for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @returns {Promise<Array>} - A list of verified contracts
 */
const getVerifiedContracts = async (workspaceId, page, itemsPerPage) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getVerifiedContracts(page, itemsPerPage);
};

/**
 * Retrieves all trace steps (internal transactions) for a transaction
 * @param {string} workspaceId - The workspace id
 * @param {string} hash - The hash of the transaction
 */
const getTransactionTraceSteps = async (workspaceId, hash) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const transaction = await Transaction.findOne({
        where: {
            hash,
            workspaceId
        }
    });
    if (!transaction)
        throw new Error('Could not find transaction');

    return transaction.getTraceSteps();
};

/**
 * Retrieves all transaction trace steps (internal transactions) for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @returns {Promise<Array>} An array of transaction trace steps
 */
const getWorkspaceTransactionTraceSteps = async (workspaceId, page, itemsPerPage) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionTraceSteps(page, itemsPerPage);
};

/**
     * Get token balance changes for a transaction
     * @param {number} workspaceId - The ID of the workspace
     * @param {string} hash - The hash of the transaction
     * @param {number} page - The page number
     * @param {number} itemsPerPage - The number of items per page
     * @returns {Promise<Array>} - An array of token balance changes
**/
const getTransactionTokenBalanceChanges = async (workspaceId, hash, page, itemsPerPage) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const transaction = await Transaction.findOne({
        where: {
            hash,
            workspaceId
        }
    });
    if (!transaction)
        throw new Error('Could not find transaction');

    return transaction.getTokenBalanceChanges(page, itemsPerPage);
};

/**
 * Returns the number of token transfers for an address in a given time range.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} address - The address to get the token transfer history for
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The number of token transfers for the address in the given time range
 */
const getAddressTokenTransferHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTokenTransferHistory(address, from, to);
};

/**
 * Returns the amount of transaction fees spent by an address in a given time range.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} address - The address to get the transaction fees for
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The amount of transaction fees spent by the address in the given time range
 */
const getAddressSpentTransactionFeeHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressSpentTransactionFeeHistory(address, from, to);
};

/**
 * Returns the number of transactions for an address in a given time range.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} address - The address to get the number of transactions for
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The number of transactions for the address in the given time range
 */
const getAddressTransactionHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTransactionHistory(address, from, to);
};

/**
 * Returns the number of transaction steps for an address.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} address - The address to get the number of transaction steps for
 * @returns {Promise<number>} The number of transaction steps for the address
 */
const countAddressTransactionTraceSteps = async (workspaceId, address) => {
    if (!workspaceId || !address)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.countAddressTransactionTraceSteps(address);
};

/**
 * Returns all internal transactions involving an address.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} address - The address to get the internal transactions for
 * @param {number} [page] - The page number
 * @param {number} [itemsPerPage] - The number of items per page
 * @returns {Promise<Array>} Internal transactions for the address
 */
const getAddressTransactionTraceSteps = async (workspaceId, address, page, itemsPerPage) => {
    if (!workspaceId || !address)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTransactionTraceSteps(address, page, itemsPerPage);
};

/**
 * Gets the burnt fees for the last 24 hours for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<number>} The burnt fees for the last 24 hours
 */
const getLast24hBurntFees = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hBurntFees();
};

/**
 * Gets the total gas used for the last 24 hours for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<number>} The total gas used for the last 24 hours
 */
const getLast24hTotalGasUsed = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hTotalGasUsed();
};

/**
 * Gets the gas utilization ratio for the last 24 hours for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<number>} The gas utilization ratio for the last 24 hours
 */
const getLast24hGasUtilisationRatio = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hGasUtilisationRatio();
};

/**
 * Gets the average transaction fee for the last 24 hours for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<number>} The average transaction fee for the last 24 hours
 */
const getLast24hAverageTransactionFee = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hAverageTransactionFee();
};

/**
 * Gets the total transaction fees for the last 24 hours for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<number>} The total transaction fees for the last 24 hours
 */
const getLast24hTransactionFees = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hTransactionFees();
};

/**
 * Gets the transaction fee history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - Start day
 * @param {string} to - End day
 * @returns {Promise<Array>} The transaction fees per day
 */
const getTransactionFeeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionFeeHistory(from, to);
};

/**
 * Replaces a workspace with a new one for explorer reset.
 * Deletes the old workspace in the background.
 * @param {number} userId - The ID of the user
 * @param {number} workspaceId - The ID of the workspace
 * @returns {Promise<Object>} The duplicated (new) workspace
 */
const replaceWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findOne({
        where: {
            id: workspaceId,
            userId
        }
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.replace();
}

/**
 * Gets the block size history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The block size history per day
 */
const getBlockSizeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getBlockSizeHistory(from, to);
};

/**
 * Gets the block time history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The block time history per day
 */
const getBlockTimeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getBlockTimeHistory(from, to);
};

/**
 * Gets the latest biggest gas spenders for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {number} [intervalInHours=24] - The interval in hours
 * @param {number} [limit=50] - The limit of gas spenders to return
 * @returns {Promise<Array>} The gas spenders with gasUsed, gasCost, percentUsed
 */
const getLatestGasSpenders = async (workspaceId, intervalInHours = 24, limit = 50) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasSpenders(intervalInHours, limit);
};

/**
 * Gets the latest biggest gas consumers for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {number} [intervalInHours=24] - The interval in hours
 * @param {number} [limit=50] - The limit of gas consumers to return
 * @returns {Promise<Array>} The gas consumers with gasUsed, gasCost
 */
const getLatestGasConsumers = async (workspaceId, intervalInHours = 24, limit = 50) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasConsumers(intervalInHours, limit);
};

/**
 * Gets the gas utilization ratio history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The gas utilization ratio history per day
 */
const getGasUtilizationRatioHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasUtilizationRatioHistory(from, to);
};

/**
 * Gets the gas limit history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The gas limit history per day
 */
const getGasLimitHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasLimitHistory(from, to);
};

/**
 * Gets the gas price history for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {string} from - The start date
 * @param {string} to - The end date
 * @returns {Promise<Array>} The gas price history with slow/average/fast levels
 */
const getGasPriceHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasPriceHistory(from, to);
};

/**
 * Gets the latest gas stats for a workspace.
 * @param {number} workspaceId - The ID of the workspace
 * @param {number} [intervalInMinutes=1] - The interval in minutes
 * @returns {Promise<Object>} Gas stats with block size, utilization, block time, and fees
 */
const getLatestGasStats = async (workspaceId, intervalInMinutes = 1) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasStats(intervalInMinutes);
};

/**
 * Creates a Stripe subscription for a user.
 * @param {number} userId - The user ID
 * @param {Object} stripeSubscription - Stripe subscription object
 * @param {Object} stripePlan - Stripe plan object
 * @returns {Promise<StripeSubscription>} The created subscription
 */
const createUserStripeSubscription = (userId, stripeSubscription, stripePlan) => {
    if (!userId || !stripeSubscription || !stripePlan)
        throw new Error('Missing parameter');

    return StripeSubscription.create({
        userId,
        stripeId: stripeSubscription.id,
        stripePlanId: stripePlan.id,
        status: stripeSubscription.status
    });
}

/**
 * Gets a user's Stripe subscription.
 * @param {number} userId - The user ID
 * @returns {Promise<StripeSubscription>} The user's subscription
 */
const getUserStripeSubscription = (userId) => {
    if (!userId)
        throw new Error('Missing parameter');

    return StripeSubscription.findOne({
        where: { userId }
    });
};

/**
 * Gets the count of trading pairs for a V2 DEX.
 * @param {number} userId - The user ID
 * @param {number} v2DexId - The DEX ID
 * @returns {Promise<number>} The pair count
 */
const getV2DexPairCount = async (userId, v2DexId) => {
    if (!userId || !v2DexId)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findOne({
        where: {
            id: v2DexId,
            '$explorer.admin.id$': userId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });
    if (!dex)
        throw new Error('Could not find dex');

    return dex.countPairs();
};

/**
 * Deletes a V2 DEX and all its pairs.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} v2DexId - The DEX ID
 * @returns {Promise<void>}
 */
const deleteV2Dex = async (firebaseUserId, v2DexId) => {
    if (!firebaseUserId || !v2DexId)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findOne({
        where: {
            id: v2DexId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });
    if (!dex)
        throw new Error('Could not find dex');

    return dex.safeDestroy();
};

/**
 * Deactivates a V2 DEX.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} v2DexId - The DEX ID
 * @returns {Promise<ExplorerV2Dex>} The updated DEX
 */
const deactivateV2Dex = async (firebaseUserId, v2DexId) => {
    if (!firebaseUserId || !v2DexId)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findOne({
        where: {
            id: v2DexId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });
    if (!dex)
        throw new Error('Could not find dex');

    return dex.update({ active: false });
};

/**
 * Activates a V2 DEX.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} v2DexId - The DEX ID
 * @returns {Promise<ExplorerV2Dex>} The updated DEX
 */
const activateV2Dex = async (firebaseUserId, v2DexId) => {
    if (!firebaseUserId || !v2DexId)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findOne({
        where: {
            id: v2DexId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });
    if (!dex)
        throw new Error('Could not find dex');

    return dex.update({ active: true });
};

/**
 * Gets a swap quote from a V2 DEX.
 * @param {number} v2DexId - The DEX ID
 * @param {string} from - Source token address
 * @param {string} to - Destination token address
 * @param {string} amount - Amount to swap
 * @param {string} direction - Swap direction
 * @param {number} slippageTolerance - Slippage tolerance percentage
 * @returns {Promise<Object>} The swap quote
 */
const getV2DexQuote = async (v2DexId, from, to, amount, direction, slippageTolerance) => {
    if (!v2DexId || !from || !to || !amount)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findByPk(v2DexId);
    if (!dex)
        throw new Error('Could not find dex');

    return dex.getQuote(from, to, amount, direction, slippageTolerance);
};

/**
 * Gets a V2 DEX by ID with pairs and explorer.
 * @param {number} v2DexId - The DEX ID
 * @returns {Promise<ExplorerV2Dex>} The DEX with associations
 */
const getExplorerV2Dex = (v2DexId) => {
    if (!v2DexId)
        throw new Error('Missing parameter');

    return ExplorerV2Dex.findByPk(v2DexId, {
        attributes: ['id', 'routerAddress', 'factoryAddress', 'active'],
        include: [
            {
                model: V2DexPair,
                as: 'pairs',
                attributes: ['id'],
                include: [
                    {
                        model: Contract,
                        as: 'token0',
                        attributes: ['address', 'tokenName', 'tokenSymbol']
                    },
                    {
                        model: Contract,
                        as: 'token1',
                        attributes: ['address', 'tokenName', 'tokenSymbol']
                    },
                    {
                        model: Contract,
                        as: 'pair',
                        attributes: ['address']
                    }
                ]
            },
            {
                model: Explorer,
                as: 'explorer',
                attrbutes: ['id', 'isDemo'],
                include: [
                    {
                        model: Workspace,
                        as: 'workspace',
                        attributes: ['rpcServer', 'networkId']
                    }, {
                        model: StripeSubscription,
                        as: 'stripeSubscription',
                        attributes: ['status']
                    }
                ]
            }
        ]
    });
};

/**
 * Creates a trading pair for a V2 DEX.
 * @param {number} dexId - The DEX ID
 * @param {string} token0 - First token address
 * @param {string} token1 - Second token address
 * @param {string} pair - Pair contract address
 * @returns {Promise<V2DexPair>} The created pair
 */
const createV2DexPair = async (dexId, token0, token1, pair) => {
    if (!dexId || !token0 || !token1 ||!pair)
        throw new Error('Missing parameter');
    
    const dex = await ExplorerV2Dex.findByPk(dexId);
    if (!dex)
        throw new Error('Could not find dex');

    return dex.safeCreatePair(token0, token1, pair);
};

/**
 * Creates a V2 DEX for an explorer.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} explorerId - The explorer ID
 * @param {string} routerAddress - Router contract address
 * @param {string} routerFactoryAddress - Factory contract address
 * @param {string} wrappedNativeTokenAddress - WETH/WBNB address
 * @returns {Promise<ExplorerV2Dex>} The created DEX
 */
const createExplorerV2Dex = async (firebaseUserId, explorerId, routerAddress, routerFactoryAddress, wrappedNativeTokenAddress) => {
    if (!firebaseUserId || !explorerId || !routerAddress || !routerFactoryAddress || !wrappedNativeTokenAddress)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$admin.firebaseUserId$': firebaseUserId
        },
        include: 'admin'
    });

    if (!explorer)
        throw new Error('Could not find explorer');

    return explorer.safeCreateV2Dex(routerAddress, routerFactoryAddress, wrappedNativeTokenAddress);
};

/**
 * Creates an explorer from configuration options.
 * @param {number} userId - The user ID
 * @param {Object} options - Explorer configuration options
 * @returns {Promise<Explorer>} The created explorer
 */
const createExplorerFromOptions = async (userId, options) => {
    if (!userId || !options)
        throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Could not find user');

    return user.createExplorerFromOptions(options);
};

/**
 * Gets faucet transaction history.
 * @param {number} faucetId - The faucet ID
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} order - Sort order
 * @param {string} orderBy - Field to order by
 * @returns {Promise<Array>} Transaction history
 */
const getFaucetTransactionHistory = async (faucetId, page, itemsPerPage, order, orderBy) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getTransactionHistory(page, itemsPerPage, order, orderBy);
};

/**
 * Gets faucet token volume over a time range.
 * @param {number} faucetId - The faucet ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Token volume history
 */
const getFaucetTokenVolume = async (faucetId, from, to) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getTokenVolume(from, to);
};

/**
 * Gets faucet request volume over a time range.
 * @param {number} faucetId - The faucet ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Request volume history
 */
const getFaucetRequestVolume = async (faucetId, from, to) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getRequestVolume(from, to);
};

/**
 * Deletes a faucet.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} faucetId - The faucet ID
 * @returns {Promise<void>}
 */
const deleteFaucet = async (firebaseUserId, faucetId) => {
    if (!firebaseUserId || !faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findOne({
        where: {
            id: faucetId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });

    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.safeDestroy();
};

/**
 * Checks if a user owns a faucet.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} faucetId - The faucet ID
 * @returns {Promise<boolean>} True if user owns the faucet
 */
const ownFaucet = async (firebaseUserId, faucetId) => {
    if (!firebaseUserId || !faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findOne({
        where: {
            id: faucetId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });

    return !!faucet;
};

/**
 * Gets the faucet for an explorer.
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<ExplorerFaucet>} The faucet
 */
const getExplorerFaucet = async (explorerId) => {
    if (!explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Could not find explorer');

    return explorer.getFaucet();
};

/**
 * Creates a faucet drip record.
 * @param {number} faucetId - The faucet ID
 * @param {string} address - Recipient address
 * @param {string} amount - Amount dripped
 * @param {string} transactionHash - Transaction hash
 * @returns {Promise<FaucetDrip>} The created drip
 */
const createFaucetDrip = async (faucetId, address, amount, transactionHash) => {
    if (!faucetId || !address || !amount || !transactionHash)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error(`Can't find faucet`);

    return faucet.safeCreateDrip(address, amount, transactionHash);
};

/**
 * Gets the private key for a faucet.
 * @param {number} faucetId - The faucet ID
 * @returns {Promise<string>} The encrypted private key
 */
const getFaucetPrivateKey = async (faucetId) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const { privateKey } = await ExplorerFaucet.findByPk(faucetId);
    return privateKey;
};

/**
 * Gets the remaining cooldown time for an address.
 * @param {number} faucetId - The faucet ID
 * @param {string} address - The address to check
 * @returns {Promise<number>} Remaining cooldown in seconds
 */
const getFaucetCooldown = async (faucetId, address) => {
    if (!faucetId || !address)
        throw new Error('Missing parameters');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error(`Can't find faucet`);

    return faucet.getCooldown(address);
};

/**
 * Deactivates a faucet.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} faucetId - The faucet ID
 * @returns {Promise<ExplorerFaucet>} The updated faucet
 */
const deactivateFaucet = async (firebaseUserId, faucetId) => {
    if (!firebaseUserId || !faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findOne({
        where: {
            id: faucetId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });

    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.deactivate();
};

/**
 * Activates a faucet.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} faucetId - The faucet ID
 * @returns {Promise<ExplorerFaucet>} The updated faucet
 */
const activateFaucet = async (firebaseUserId, faucetId) => {
    if (!firebaseUserId || !faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findOne({
        where: {
            id: faucetId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });

    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.activate();
};

/**
 * Gets a faucet by ID with explorer and workspace.
 * @param {number} id - The faucet ID
 * @returns {Promise<ExplorerFaucet>} The faucet with associations
 */
const getFaucet = async (id) => {
    if (!id)
        throw new Error('Missing parameter');

    return ExplorerFaucet.findByPk(id, {
        attributes: ['id', 'address', 'amount', 'interval', 'active'],
        include: {
            model: Explorer,
            as: 'explorer',
            attributes: ['id'],
            include: {
                model: Workspace,
                as: 'workspace',
                attributes: ['rpcServer']
            }
        }
    });
};

/**
 * Updates faucet settings.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} faucetId - The faucet ID
 * @param {string} amount - Drip amount
 * @param {number} interval - Cooldown interval in seconds
 * @returns {Promise<ExplorerFaucet>} The updated faucet
 */
const updateFaucet = async (firebaseUserId, faucetId, amount, interval) => {
    if (!firebaseUserId || !faucetId || !amount || !interval)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findOne({
        where: {
            id: faucetId,
            '$explorer.admin.firebaseUserId$': firebaseUserId
        },
        include: {
            model: Explorer,
            as: 'explorer',
            include: 'admin'
        }
    });

    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.safeUpdate(amount, interval);
};

/**
 * Creates a faucet for an explorer.
 * @param {string} firebaseUserId - The Firebase user ID
 * @param {number} explorerId - The explorer ID
 * @param {string} amount - Drip amount
 * @param {number} interval - Cooldown interval in seconds
 * @returns {Promise<ExplorerFaucet>} The created faucet
 */
const createFaucet = async (firebaseUserId, explorerId, amount, interval) => {
    if (!firebaseUserId || !explorerId || !amount || !interval)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$admin.firebaseUserId$': firebaseUserId
        },
        include: 'admin'
    });

    if (!explorer)
        throw new Error('Could not find explorer');

    return explorer.safeCreateFaucet(amount, interval);
};

/**
 * Gets the Stripe subscription for an explorer.
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<StripeSubscription>} The subscription with plan
 */
const getStripeSubscription = async (explorerId) => {
    if (!explorerId)
        throw new Error('Missing parameter');

    return StripeSubscription.findOne({
        where: { explorerId },
        include: 'stripePlan'
    });
};

/**
 * Gets the quota extension Stripe plan.
 * @returns {Promise<StripePlan>} The quota extension plan
 */
const getQuotaExtensionPlan = () => {
    return StripePlan.findOne({
        where: {
            'capabilities.quotaExtension': true
        },
        attributes: ['capabilities', 'slug']
    })
};

/**
 * Destroys a Stripe quota extension.
 * @param {number} stripeSubscriptionId - The subscription ID
 * @returns {Promise<void>}
 */
const destroyStripeQuotaExtension = async (stripeSubscriptionId) => {
    if (!stripeSubscriptionId)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeDestroyStripeQuotaExtension();
};

/**
 * Updates a Stripe quota extension.
 * @param {number} stripeSubscriptionId - The subscription ID
 * @param {number} quota - The new quota value
 * @returns {Promise<StripeQuotaExtension>} The updated extension
 */
const updateStripeQuotaExtension = async (stripeSubscriptionId, quota) => {
    if (!stripeSubscriptionId || !quota)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeUpdateStripeQuotaExtension(quota);
};

/**
 * Creates a Stripe quota extension.
 * @param {number} stripeSubscriptionId - The subscription ID
 * @param {string} stripeId - The Stripe subscription ID
 * @param {number} stripePlanId - The plan ID
 * @param {number} quota - The quota value
 * @returns {Promise<StripeQuotaExtension>} The created extension
 */
const createStripeQuotaExtension = async (stripeSubscriptionId, stripeId, stripePlanId, quota) => {
    if (!stripeSubscriptionId || !stripeId || !stripePlanId || !quota)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeCreateStripeQuotaExtension(stripeId, stripePlanId, quota);
};

/**
 * Gets transaction logs for a transaction.
 * @param {number} workspaceId - The workspace ID
 * @param {string} hash - The transaction hash
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @returns {Promise<Object>} Object with count and logs array
 */
const getTransactionLogs = async (workspaceId, hash, page, itemsPerPage) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const { count, rows: logs } = await workspace.getTransactionLogs(hash, page, itemsPerPage);

    return { count, logs };
};

/**
 * Marks a workspace for deletion.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<Workspace>} The updated workspace
 */
const markWorkspaceForDeletion = async (userId, workspaceId) => {
    if (!userId || !workspaceId)
        throw new Error('Missing parameter');
    
    const workspace = await Workspace.findOne({
        where: {
            id: workspaceId,
            userId
        }
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.update({ pendingDeletion: true, public: false });
};

/**
 * Updates a QuickNode subscription plan.
 * @param {string} qnId - The QuickNode ID
 * @param {string} qnEndpointId - The QuickNode endpoint ID
 * @param {number} stripePlanId - The new plan ID
 * @returns {Promise<StripeSubscription>} The updated subscription
 */
const updateQuicknodeSubscription = async (qnId, qnEndpointId, stripePlanId) => {
    if (!qnId || !qnEndpointId || !stripePlanId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            '$admin.qnId$': qnId,
            '$workspace.qnEndpointId$': qnEndpointId
        },
        include: ['admin', 'workspace', 'stripeSubscription']
    });

    if (!explorer)
        throw new Error('Cannot find explorer');

    if (!explorer.stripeSubscription)
        throw new Error('Cannot find subscription');

    return explorer.stripeSubscription.update({ stripePlanId });
};

/**
 * Finds an explorer by QuickNode credentials.
 * @param {string} qnId - The QuickNode ID
 * @param {string} qnEndpointId - The QuickNode endpoint ID
 * @returns {Promise<Object|null>} The explorer or null
 */
const findQuicknodeExplorer = async (qnId, qnEndpointId) => {
    if (!qnId || !qnEndpointId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            '$admin.qnId$': qnId,
            '$workspace.qnEndpointId$': qnEndpointId
        },
        include: [
            'admin', 'workspace',
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: 'stripePlan'
            }
        ]
    });

    return explorer ? explorer.toJSON() : null;
};

/**
 * Finds a user by QuickNode ID.
 * @param {string} qnId - The QuickNode ID
 * @returns {Promise<Object|null>} The user or null
 */
const findQuicknodeUser = async (qnId) => {
    if (!qnId)
        throw new Error('Missing parameter');

    const user = await User.findOne({
        where: { qnId },
        include: {
            model: Explorer,
            as: 'explorers',
            include: 'workspace'
        }
    });

    return user ? user.toJSON() : null;
};

/**
 * Finds a workspace by QuickNode credentials.
 * @param {string} qnId - The QuickNode ID
 * @param {string} qnEndpointId - The QuickNode endpoint ID
 * @returns {Promise<Workspace>} The workspace
 */
const findQuicknodeWorkspace = (qnId, qnEndpointId) => {
    if (!qnId || !qnEndpointId)
        throw new Error('Missing parameter');

    return Workspace.findOne({
        where: {
            qnEndpointId,
            '$user.qnId$': qnId,
            pendingDeletion: false
        },
        include: ['explorer', 'user']
    });
};

/**
 * Creates a workspace for QuickNode integration.
 * @param {string} qnId - The QuickNode ID
 * @param {string} qnEndpointId - The QuickNode endpoint ID
 * @param {string} name - Workspace name
 * @param {string} rpcServer - RPC server URL
 * @param {number} networkId - Network/chain ID
 * @returns {Promise<Workspace>} The created workspace
 */
const createQuicknodeWorkspace = async (qnId, qnEndpointId, name, rpcServer, networkId) => {
    if (!qnId || !qnEndpointId || !name || !rpcServer || !networkId)
        throw new Error('Missing parameter');

    const user = await User.findOne({ where: { qnId }});
    if (!user)
        throw new Error('Cannot find user');

    return user.safeCreateWorkspace({
        name, networkId, rpcServer, qnEndpointId,
        dataRetentionLimit: 0,
        public: true,
        chain: 'ethereum', 
        browserSyncEnabled: false,
        erc721LoadingEnabled: false
    });
};

/**
 * Checks if a workspace needs batch reset based on block count.
 * @param {string} userId - The Firebase user ID
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<boolean>} True if reset is needed
 */
const workspaceNeedsBatchReset = async (userId, workspaceId) => {
    if (!userId || !workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findOne({
        where: {
            id: workspaceId,
            '$user.firebaseUserId$': userId
        },
        include: 'user'
    });

    if (!workspace)
        throw new Error('Cannot find workspace');

    const blocks = await workspace.getBlocks({ limit: getMaxBlockForSyncReset() });

    return blocks.length == getMaxBlockForSyncReset();
};

/**
 * Resets an explorer's transaction quota.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<Explorer>} The updated explorer
 */
const resetExplorerTransactionQuota = async (userId, explorerId) => {
    if (!userId || !explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.resetTransactionQuota();
};

/**
 * Marks an explorer as a demo explorer.
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<Explorer>} The updated explorer
 */
const makeExplorerDemo = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ isDemo: true });
};

/**
 * Migrates a demo explorer to a real user.
 * @param {number} explorerId - The explorer ID
 * @param {number} userId - The user ID
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Promise<Explorer>} The migrated explorer
 */
const migrateDemoExplorer = async (explorerId, userId, stripeSubscription) => {
    if (!explorerId || !userId || !stripeSubscription) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Cannot find user');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.migrateDemoTo(userId, stripeSubscription);
};

/**
 * Creates an explorer with its associated workspace.
 * @param {number} userId - The user ID
 * @param {Object} workspaceData - Workspace configuration
 * @returns {Promise<Workspace>} The created workspace with explorer
 */
const createExplorerWithWorkspace = async (userId, workspaceData) => {
    if (!workspaceData) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Cannot find user');

    return user.safeCreateWorkspaceWithExplorer(workspaceData);
};

/**
 * Stops syncing for an explorer.
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<Explorer>} The updated explorer
 */
const stopExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: false });
};

/**
 * Starts syncing for an explorer.
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<Explorer>} The updated explorer
 */
const startExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: true });
};

/**
 * Resets RPC health check failed attempts.
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<RpcHealthCheck|null>} The updated health check or null
 */
const resetFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.resetFailedAttempts();
};

/**
 * Increments RPC health check failed attempts.
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<RpcHealthCheck|null>} The updated health check or null
 */
const incrementFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.incrementFailedAttempts();
};

/**
 * Checks if a user can sync blocks (based on plan and workspace count).
 * @param {number} userId - The user ID
 * @returns {Promise<boolean>} True if user can sync
 */
const canUserSyncBlock = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId, {
        include: 'workspaces'
    });

    if (!user.isPremium && user.workspaces.length > 1)
        return false;

    return true;
};

/**
 * Deletes a workspace.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<void>}
 */
const deleteWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace || workspace.userId != userId)
        throw new Error('Cannot find workspace');

    return workspace.safeDelete();
};

/**
 * Stores a transaction receipt.
 * @param {number} transactionId - The transaction ID
 * @param {Object} receipt - The receipt data
 * @returns {Promise<TransactionReceipt>} The created receipt
 */
const storeTransactionReceipt = async (transactionId, receipt) => {
    if (!transactionId || !receipt) throw new Error('Missing parameter');

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction)
        throw new Error('Cannot find transaction');

    return transaction.safeCreateReceipt(receipt);
};

/**
 * Disables trial mode for a user.
 * @param {number} userId - The user ID
 * @returns {Promise<User>} The updated user
 */
const disableUserTrial = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);

    if (!user)
        throw new Error('Cannot find user');

    return user.disableTrialMode();
};

/**
 * Gets an explorer domain by ID.
 * @param {number} userId - The user ID
 * @param {number} explorerDomainId - The domain ID
 * @returns {Promise<Object|null>} The domain or null
 */
const getExplorerDomainById = async (userId, explorerDomainId) => {
    if (!userId || !explorerDomainId) throw new Error('Missing parameter');

    const domain = await ExplorerDomain.findOne({
        where: {
            id: explorerDomainId,
            '$explorer.userId$': userId
        },
        include: [
            {
                model: Explorer,
                as: 'explorer',
                attributes: ['userId']
            }
        ]
    });

    return domain ? domain.toJSON() : null;
};

/**
 * Deletes an explorer domain.
 * @param {number} userId - The user ID
 * @param {number} explorerDomainId - The domain ID
 * @returns {Promise<void>}
 */
const deleteExplorerDomain = async (userId, explorerDomainId) => {
    if (!userId || !explorerDomainId) throw new Error('Missing parameter');

    const domain = await ExplorerDomain.findOne({
        where: {
            id: explorerDomainId,
            '$explorer.userId$': userId
        },
        include: [
            {
                model: Explorer,
                as: 'explorer'
            }
        ]
    });

    if (!domain)
        throw new Error('Could not find domain');
    
    return domain.destroy();
};

/**
 * Creates a custom domain for an explorer.
 * @param {number} explorerId - The explorer ID
 * @param {string} domain - The domain name
 * @returns {Promise<ExplorerDomain>} The created domain
 */
const createExplorerDomain = async (explorerId, domain) => {
    if (!explorerId || !domain) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeCreateDomain(domain);
};

/**
 * Deletes an explorer.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<void>}
 */
const deleteExplorer = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            '$admin.id$': userId
        },
        include: ['admin']
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);
    
    return explorer.safeDelete();
};

/**
 * Creates an explorer from an existing workspace.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<Explorer>} The created explorer
 */
const createExplorerFromWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findOne({
        where: {
            userId: userId,
            id: workspaceId,
        }
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    const explorer = await workspace.safeCreateExplorer();

    return explorer ? explorer.toJSON() : null;
};

/**
 * Gets a contract by ID.
 * @param {number} contractId - The contract ID
 * @returns {Promise<Object|null>} The contract or null
 */
const getContractById = async (contractId) => {
    if (!contractId) throw new Error('Missing parameter');

    const contract = await Contract.findByPk(contractId);

    return contract ? contract.toJSON() : null;
};

/**
 * Deletes an explorer's subscription.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<void>}
 */
const deleteExplorerSubscription = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeDeleteSubscription();
};

/**
 * Cancels an explorer's subscription at period end.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<StripeSubscription>}
 */
const cancelExplorerSubscription = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeCancelSubscription();
};

/**
 * Reverts a pending subscription cancellation.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @returns {Promise<StripeSubscription>}
 */
const revertExplorerSubscriptionCancelation = async (userId, explorerId) => {
    if (!userId || !explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    return explorer.safeRevertSubscriptionCancelation();
};

/**
 * Updates an explorer's subscription plan.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @param {number} stripePlanId - The new plan ID
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Promise<StripeSubscription>}
 */
const updateExplorerSubscription = async (userId, explorerId, stripePlanId, stripeSubscription) => {
    if (!userId || !explorerId || !stripePlanId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    const newPlan = await StripePlan.findByPk(stripePlanId);
    if (!newPlan)
        throw new Error(`Can't find plan`);

    if (!explorer)
        throw new Error(`Can't find explorer`);

    let cycleEndsAt = new Date(0);
    let status = 'active';
    let stripeId;

    if (stripeSubscription) {
        const customer = stripeSubscription.customer;
        cycleEndsAt = new Date(stripeSubscription.current_period_end * 1000);
        stripeId = stripeSubscription.id;

        if (newPlan.price == 0)
            status = 'active';
        else if (stripeSubscription.status == 'trialing' && !customer.default_source && !customer.invoice_settings.default_payment_method)
            status = stripeSubscription.default_payment_method ? 'trial_with_card' : 'trial';
        else if (stripeSubscription.status == 'trialing' && (customer.default_source || customer.invoice_settings.default_payment_method))
            status = 'trial_with_card';
        else
            status = stripeSubscription.status;
    }

    return explorer.safeUpdateSubscription(stripePlanId, stripeId, cycleEndsAt, status);
};

/**
 * Creates a subscription for an explorer.
 * @param {number} userId - The user ID
 * @param {number} explorerId - The explorer ID
 * @param {number} stripePlanId - The plan ID
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Promise<StripeSubscription>}
 */
const createExplorerSubscription = async (userId, explorerId, stripePlanId, stripeSubscription) => {
    if (!userId || !explorerId || !stripePlanId) throw new Error('Missing parameter');

    const explorer = await Explorer.findOne({
        where: {
            id: explorerId,
            userId: userId
        }
    });

    if (!explorer)
        throw new Error(`Can't find explorer`);

    let cycleEndsAt = new Date(0);
    let status = 'active';
    let stripeId;

    if (stripeSubscription) {
        const customer = stripeSubscription.customer;
        cycleEndsAt = new Date(stripeSubscription.current_period_end * 1000);
        stripeId = stripeSubscription.id;

        if (stripeSubscription.status == 'trialing' && !customer.default_source && !customer.invoice_settings.default_payment_method)
            status = stripeSubscription.default_payment_method ? 'trial_with_card' : 'trial';
        else if (stripeSubscription.status == 'trialing' && (customer.default_source || customer.invoice_settings.default_payment_method))
            status = 'trial_with_card';
        else
            status = stripeSubscription.status;
    }

    return explorer.safeCreateSubscription(stripePlanId, stripeId, cycleEndsAt, status);
};

/**
 * Gets all public explorer plans.
 * @returns {Promise<Array<StripePlan>>} Array of plans
 */
const getExplorerPlans = () => {
    return StripePlan.findAll({
        where: { public: true },
        attributes: ['capabilities', 'id', 'name', 'slug', 'stripePriceId', 'price'],
        order: [['id']]
    });
};

/**
 * Stores contract verification data.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The contract address
 * @param {Object} verificationData - Verification data
 * @returns {Promise<ContractVerification>}
 */
const storeContractVerificationData = async (workspaceId, address, verificationData) => {
    if (!workspaceId || !address || !verificationData) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const contract = await workspace.getContractByAddress(address);

    if (!contract)
        throw new Error('Cannot find contract');

    return contract.safeCreateVerification(verificationData);
};

/**
 * Gets a Stripe plan by slug.
 * @param {string} slug - The plan slug
 * @returns {Promise<Object|null>} The plan or null
 */
const getStripePlan = async (slug) => {
    const plan = await StripePlan.findOne({
        where: { slug }
    });
    return plan ? plan.toJSON() : null;
}

/**
 * Updates explorer branding settings.
 * @param {number} explorerId - The explorer ID
 * @param {Object} branding - Branding configuration
 * @returns {Promise<Explorer>}
 */
const updateExplorerBranding = async (explorerId, branding) => {
    if (!explorerId || !branding) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateBranding(branding);
};

/**
 * Updates explorer settings.
 * @param {number} explorerId - The explorer ID
 * @param {Object} settings - Settings configuration
 * @returns {Promise<Explorer>}
 */
const updateExplorerSettings = async (explorerId, settings) => {
    if (!explorerId || !settings) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateSettings(settings);
};

/**
 * Updates the workspace for an explorer.
 * @param {number} explorerId - The explorer ID
 * @param {number} workspaceId - The new workspace ID
 * @returns {Promise<Explorer>}
 */
const updateExplorerWorkspace = async (explorerId, workspaceId) => {
    if (!explorerId || !workspaceId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace')

    if (explorer.userId != workspace.userId)
        throw new Error('Invalid workspace');

    return explorer.update({ workspaceId: workspace.id, rpcServer: workspace.rpcServer, chainId: workspace.networkId });
};

/**
 * Gets an explorer by ID.
 * @param {number} userId - The user ID
 * @param {number} id - The explorer ID
 * @param {boolean} [withDemo=false] - Include demo explorers
 * @returns {Promise<Explorer>}
 */
const getExplorerById = (userId, id, withDemo = false) => {
    if (!userId || !id) throw new Error('Missing parameter');

    const where = withDemo ?
        {[Op.or]: [{ id, userId, isDemo: false }, { id, userId: getDemoUserId(), isDemo: true }]} :
        { id, userId };

    return Explorer.findOne({
        where,
        include: [
            {
                model: ExplorerDomain,
                as: 'domains'
            },
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: [
                    { model: StripePlan, as: 'stripePlan' },
                    { model: StripeQuotaExtension, as: 'stripeQuotaExtension', include: 'stripePlan' }
                ]
            },
            {
                model: User,
                as: 'admin'
            },
            {
                model: Workspace,
                as: 'workspace',
                include: [
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck',
                        attributes: ['failedAttempts', 'isReachable']
                    }
                ]
            },
            {
                model: ExplorerFaucet,
                as: 'faucet',
                attributes: ['id', 'address', 'amount', 'interval', 'active']
            },
            {
                model: ExplorerV2Dex,
                as: 'v2Dex',
                attributes: ['id', 'routerAddress', 'factoryAddress', 'active'],
                include: [
                    {
                        model: Contract,
                        as: 'wrappedNativeTokenContract',
                        attributes: ['address', 'tokenSymbol', 'tokenName']
                    }
                ]
            }
        ]
    });
}

/**
 * Gets a user's explorers with pagination.
 * @param {number} userId - The user ID
 * @param {number} [page=1] - Page number
 * @param {number} [itemsPerPage=10] - Items per page
 * @param {string} [order='DESC'] - Sort order
 * @param {string} [orderBy='id'] - Field to order by
 * @returns {Promise<Object>} Object with items and total
 */
const getUserExplorers = async (userId, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') => {
    if (!userId) throw new Error('Missing parameter');

    let sanitizedOrderBy = ['id', 'name'].indexOf(orderBy) > -1 ? orderBy : 'id';
    if (sanitizedOrderBy == 'name')
        sanitizedOrderBy = Sequelize.fn('lower', Sequelize.col('"Explorer".name'));
    
    const { count, rows: explorers } = await Explorer.findAndCountAll({
        subQuery: false,
        where: { userId },
        attributes: ['id', 'name', 'domain', 'rpcServer', 'slug'],
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage,
        order: [[sanitizedOrderBy, order]],
        include: [
            {
                model: ExplorerDomain,
                as: 'domains',
                attributes: ['domain'],
            },
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['name'],
            },
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                attributes: ['status', 'isActive', 'isPendingCancelation', 'isTrialing', 'isTrialingWithCard']
            }
        ]
    });

    return {
        items: explorers.map(e => e.toJSON()),
        total: count
    };
}

/**
 * Updates workspace RPC health check status.
 * @param {number} workspaceId - The workspace ID
 * @param {boolean} isReachable - Whether RPC is reachable
 * @returns {Promise<RpcHealthCheck>}
 */
const updateWorkspaceRpcHealthCheck = async (workspaceId, isReachable) => {
    if (!workspaceId || isReachable === null || isReachable === undefined) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateRpcHealthCheck(isReachable);
};

/**
 * Updates workspace integrity check status.
 * @param {number} workspaceId - The workspace ID
 * @param {Object} params - Check parameters
 * @param {number} [params.blockId] - Block ID being checked
 * @param {string} [params.status] - Check status
 * @returns {Promise<IntegrityCheck>}
 */
const updateWorkspaceIntegrityCheck = async (workspaceId, { blockId, status }) => {
    if (!workspaceId || (!blockId && !status)) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateIntegrityCheck({ blockId, status });
};

/**
 * Gets a transaction with associations for processing.
 * @param {number} transactionId - The transaction ID
 * @returns {Promise<Transaction>}
 */
const getTransactionForProcessing = transactionId => {
    if (!transactionId) throw new Error('Missing parameter.');

    return Transaction.findOne({
        where: { id: transactionId },
        include: [
            {
                model: Contract,
                as: 'contract',
                attributes: ['abi']
            },
            {
                model: TransactionReceipt,
                as: 'receipt',
            },
            {
                model: TokenTransfer,
                as: 'tokenTransfers'
            },
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'name', 'public', 'rpcServer', 'tracing'],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firebaseUserId']
                    },
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck'
                    },
                    {
                        model: Explorer,
                        as: 'explorer',
                        include: 'stripeSubscription'
                    }
                ]
            }
        ]
    });
};

/**
 * Reverts a partial block if it's incomplete.
 * @param {number} blockId - The block ID
 * @returns {Promise<void>}
 */
const revertPartialBlock = async (blockId) => {
    if (!blockId) throw new Error('Missing parameter.');

    const block = await Block.findByPk(blockId);

    return block ? block.revertIfPartial() : null;
};

/**
 * Syncs a partial block to a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {Object} block - Block data
 * @returns {Promise<Object|null>} The created block or null
 */
const syncPartialBlock = async (workspaceId, block) => {
    if (!workspaceId || !block) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const existingBlock = await workspace.findBlockByNumber(block.number);

    if (existingBlock)
        return null;

    const newBlock = await workspace.safeCreatePartialBlock(block);

    return newBlock ? newBlock.toJSON() : null;
};

/**
 * Syncs a full block with transactions to a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {Object} data - Block and transaction data
 * @returns {Promise<Object|null>} The created block or null
 */
const syncFullBlock = async (workspaceId, data) => {
    if (!workspaceId || !data) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const existingBlock = await workspace.findBlockByNumber(data.block.number);

    if (existingBlock) {
        const newBlock = await workspace.safeCreateFullBlock(data);

        return newBlock ? newBlock.toJSON() : null;
    }
    else
        return null;
};

/**
 * Creates a new explorer.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @param {number} chainId - The chain ID
 * @param {string} name - Explorer name
 * @param {string} rpcServer - RPC URL
 * @param {string} slug - URL slug
 * @param {Object} themes - Theme configuration
 * @param {string} totalSupply - Total supply
 * @param {string} domain - Domain name
 * @param {Object} token - Token configuration
 * @returns {Promise<Object|null>} The created explorer or null
 */
const createExplorer = async (userId, workspaceId, chainId, name, rpcServer, slug, themes, totalSupply, domain, token) => {
    if (!userId || !workspaceId || !chainId || !name || !rpcServer || !slug)
        throw new Error('Missing parameter');

    const explorer = await Explorer.safeCreateExplorer({
        userId: userId,
        workspaceId: workspaceId,
        chainId: chainId,
        name: name,
        rpcServer: rpcServer,
        slug: slug,
        themes: themes,
        totalSupply: totalSupply,
        domain: domain,
        token: token
    });
    return explorer ? explorer.toJSON() : null;
};

/**
 * Updates browser sync setting for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {boolean} newValue - New browser sync value
 * @returns {Promise<Workspace>}
 */
const updateBrowserSync = async (workspaceId, newValue) => {
    if (!workspaceId || newValue === undefined || newValue === null)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.update({ browserSyncEnabled: newValue });
};

/**
 * Updates user Firebase password hash.
 * @param {string} email - User email
 * @param {string} passwordSalt - Password salt
 * @param {string} passwordHash - Password hash
 * @returns {Promise<User>}
 */
const updateUserFirebaseHash = async (email, passwordSalt, passwordHash) => {
    if (!email || !passwordSalt || !passwordHash)
        throw new Error('Missing parameter');

    const user = await User.findOne({ where: { email: email }});

    return user.update({ passwordSalt, passwordHash });
};

/**
 * Sets a user's password.
 * @param {string} email - User email
 * @param {string} password - New password
 * @returns {Promise<User>}
 */
const setUserPassword = async (email, password) => {
    if (!email || !password)
        throw new Error('Missig parameter');

    const user = await User.findOne({ where: { email: email }});

    if (!user)
        throw new Error(`Can't find user with this email address.`);

    const { passwordHash, passwordSalt } = await firebaseHash(password);

    return user.update({ passwordHash, passwordSalt });
};

/**
 * Gets a user by email.
 * @param {string} email - User email
 * @returns {Promise<Object|null>} The user or null
 */
const getUserByEmail = async (email) => {
    const user = await User.findOne({ where: { email: email }, include: 'currentWorkspace' });
    return user ? user.toJSON() : null;
};

/**
 * Gets custom transaction function for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<string|null>} The function code or null
 */
const getCustomTransactionFunction = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    return await workspace.getCustomTransactionFunction();
};

/**
 * Gets token transfers for an address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The address
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} order - Sort order
 * @param {string} orderBy - Field to order by
 * @param {Array} tokenTypes - Token types to filter
 * @returns {Promise<Object>} Token transfers with count
 */
const getAddressTokenTransfers = async (workspaceId, address, page, itemsPerPage, order, orderBy, tokenTypes) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const transfers = await workspace.getFilteredAddressTokenTransfers(address, page, itemsPerPage, order, orderBy, tokenTypes);
    const transferCount = await workspace.countAddressTokenTransfers(address, tokenTypes);

    return {
        items: transfers.map(t => t.toJSON()),
        total: transferCount
    };
};

/**
 * Gets transaction statistics for an address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The address
 * @returns {Promise<Object>} Transaction stats
 */
const getAddressTransactionStats = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    let stats = await workspace.getAddressTransactionStats(address) || {};
    stats.tokenTransferCount = await workspace.countAddressTokenTransfers(address);
    if (workspace.tracing) {
        const traceStepCount = await workspace.countAddressTransactionTraceSteps(address);
        stats.internalTransactionCount = traceStepCount;
    }

    return stats;
};

/**
 * Gets token transfers for a transaction.
 * @param {number} workspaceId - The workspace ID
 * @param {string} transactionHash - Transaction hash
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} order - Sort order
 * @param {string} orderBy - Field to order by
 * @returns {Promise<Object>} Token transfers
 */
const getTransactionTokenTransfers = async (workspaceId, transactionHash, page, itemsPerPage, order, orderBy) => {
    if (!workspaceId || !transactionHash) throw new Error('Missing parameter');

    const transaction = await Transaction.findOne({
        where: {
            hash: transactionHash,
            workspaceId
        }
    });

    if (!transaction)
        throw new Error('Cannot find transaction');

    return transaction.getFilteredTokenTransfers(page, itemsPerPage, order, orderBy);
};

/**
 * Gets token holder history for a contract.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Holder history
 */
const getTokenHolderHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenHolderHistory(from, to);
};

/**
 * Gets token circulating supply history.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Supply history
 */
const getTokenCirculatingSupply = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenCirculatingSupply(from, to);
};

/**
 * Gets token transfer volume.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @param {string} [address] - Contract address
 * @param {string} [type] - Token type
 * @returns {Promise<Array>} Volume history
 */
const getTokenTransferVolume = async (workspaceId, from, to, address, type) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (address) {
        const contract = await workspace.findContractByAddress(address);
        if (!contract)
            throw new Error(`Can't find contract at this address`);
    }

    return workspace.getTokenTransferVolume(from, to, address, type);
};

/**
 * Gets token holders for a contract.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @returns {Promise<Object>} Holders with total
 */
const getTokenHolders = async (workspaceId, address, page, itemsPerPage, orderBy, order) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    const holders = await contract.getTokenHolders(page, itemsPerPage, orderBy, order);
    const holderCount = await contract.countTokenHolders();

    return {
        items: holders,
        total: holderCount
    };
};

/**
 * Gets token statistics for a contract.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @returns {Promise<Object>} Token stats
 */
const getTokenStats = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    const tokenHolderCount = contract ? await contract.countTokenHolders() : null;
    const transactionCount = contract ? await contract.countTransactions() : null;
    const tokenTransferCount = contract ? await contract.countTokenTransfers() : null;
    const tokenCirculatingSupply = contract ? await contract.getCurrentTokenCirculatingSupply() : null;

    return {
        tokenHolderCount: tokenHolderCount,
        transactionCount: transactionCount,
        tokenTransferCount: tokenTransferCount,
        tokenCirculatingSupply: tokenCirculatingSupply
    };
};

/**
 * Gets token transfers for a contract.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @param {number} [fromBlock] - Start block
 * @returns {Promise<Object>} Token transfers
 */
const getTokenTransfers = async (workspaceId, address, page, itemsPerPage, orderBy, order, fromBlock) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address.`);

    const rows = await contract.getTokenTransfers(page, itemsPerPage, orderBy, order, fromBlock);

    return { items: rows.map(t => t.toJSON()) };
};

/**
 * Gets a token transfer for processing.
 * @param {number} tokenTransferId - Token transfer ID
 * @returns {Promise<Object|null>} Token transfer or null
 */
const getTokenTransferForProcessing = async (tokenTransferId) => {
    if (!tokenTransferId) throw new Error('Missing parameter');

    const tokenTransfer = await TokenTransfer.findOne({
        where: { id: tokenTransferId },
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['name', 'rpcServer', 'public'],
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['firebaseUserId']
                }
            },
            {
                model: Transaction,
                as: 'transaction',
                attributes: ['blockNumber']
            }
        ]
    });

    return tokenTransfer ? tokenTransfer.toJSON() : null;
}

/**
 * Gets contract event logs.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {string} signature - Event signature
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @returns {Promise<Object>} Logs
 */
const getContractLogs = async (workspaceId, address, signature, page, itemsPerPage, orderBy, order) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        return { items: [], total: 0 };

    const filteredLogs = await contract.getFilteredLogs(signature, page, itemsPerPage, orderBy, order);

    return {
        items: filteredLogs,
    };
};

/**
 * Stores contract data.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @param {Object} [data={}] - Contract data
 * @returns {Promise<Object|null>} The contract or null
 */
const storeContractDataWithWorkspaceId = async (workspaceId, address, data = {}) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    const contract = await workspace.safeCreateOrUpdateContract({
        address: address,
        ...data
    });

    return contract ? contract.toJSON() : null;
};

/**
 * Gets a contract by workspace and address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - Contract address
 * @returns {Promise<Object|null>} The contract or null
 */
const getContractByWorkspaceId = async (workspaceId, address) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

/**
 * Gets ERC721 token transfers by token ID.
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - Contract address
 * @param {string} tokenId - Token ID
 * @returns {Promise<Array>} Token transfers
 */
const getErc721TokenTransfers = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    if (!contract)
        return [];

    const transfers = await contract.getErc721TokenTransfersByTokenId(tokenId);

    return transfers.map(t => t.toJSON());
};

/**
 * Updates an ERC721 token.
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - Contract address
 * @param {string} index - Token index
 * @param {Object} fields - Fields to update
 * @returns {Promise<ERC721Token>}
 */
const updateErc721Token = async (workspaceId, contractAddress, index, fields) => {
    if (!workspaceId || !contractAddress || !index || !fields) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeUpdateErc721Token(index, fields);
};

/**
 * Gets an ERC721 token by ID.
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - Contract address
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object|null>} The token or null
 */
const getContractErc721Token = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const token = await contract.getErc721Token(tokenId);

    return token ? token.toJSON() : null;
};

/**
 * Gets ERC721 tokens for a contract.
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - Contract address
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @returns {Promise<Object>} Tokens with total
 */
const getContractErc721Tokens = async (workspaceId, contractAddress, page, itemsPerPage, orderBy, order) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const tokens = await contract.getFilteredErc721Tokens(page, itemsPerPage, orderBy, order);
    const total = await contract.countErc721Tokens();

    return {
        items: tokens.map(t => t.toJSON()),
        total: total
    };
};

/**
 * Stores an ERC721 token.
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - Contract address
 * @param {Object} token - Token data
 * @returns {Promise<ERC721Token>}
 */
const storeErc721Token = async (workspaceId, contractAddress, token) => {
    if (!workspaceId || !contractAddress || !token) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeCreateOrUpdateErc721Token(token);
};

/**
 * Sets the remote flag for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {boolean} flag - Remote flag value
 * @returns {Promise<Workspace>}
 */
const setWorkspaceRemoteFlag = async (workspaceId, flag) => {
    const workspace = await Workspace.findByPk(workspaceId);

    return workspace.update({ isRemote: flag });
};

/**
 * Gets cumulative deployed contract count.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Count history
 */
const getCumulativeDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeDeployedContractCount = await workspace.getCumulativeDeployedContractCount(from, to);
    return cumulativeDeployedContractCount;
};

/**
 * Gets deployed contract count per day.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Count history
 */
const getDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const deployedContractCount = await workspace.getDeployedContractCount(from, to);
    return deployedContractCount;
};

/**
 * Gets unique wallet count per day.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Count history
 */
const getUniqueWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const uniqueWalletCount = await workspace.getUniqueWalletCount(from, to);
    return uniqueWalletCount;
};

/**
 * Gets cumulative wallet count.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Count history
 */
const getCumulativeWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeWalletCount = await workspace.getCumulativeWalletCount(from, to);
    return cumulativeWalletCount;
};

/**
 * Gets average gas price in date range.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Average gas price history
 */
const getAverageGasPrice = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgGasPrice = await workspace.getAverageGasPrice(from, to);
    return avgGasPrice;
};

/**
 * Gets average transaction fee in date range.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Average fee history
 */
const getAverageTransactionFee = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgTransactionFee = await workspace.getAverageTransactionFee(from, to);
    return avgTransactionFee;
};

/**
 * Gets transaction volume in date range.
 * @param {number} workspaceId - The workspace ID
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {Promise<Array>} Transaction volume history
 */
const getTransactionVolume = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const transactions = await workspace.getTransactionVolume(from, to);
    return transactions;
};

/**
 * Gets count of active wallets in workspace.
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<number>} Active wallet count
 */
const getActiveWalletCount = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.countActiveWallets();
};

/**
 * Gets total transaction count for workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {string} [since] - Optional date to count from
 * @returns {Promise<number>} Transaction count
 */
const getTotalTxCount = async (workspaceId, since) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionCount(since);
};

/**
 * Gets latest token balances for an address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The wallet address
 * @param {Array<string>} [tokenPatterns] - Token patterns to filter
 * @returns {Promise<Array>} Token balances
 */
const getAddressLatestTokenBalances = async (workspaceId, address, tokenPatterns) => {
    if (!workspaceId|| !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    return await workspace.safeFindLatestTokenBalances(address, tokenPatterns);
};

/**
 * Searches for a contract by address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The address to search for
 * @returns {Promise<Array>} Search results with type and data
 */
const searchForAddress = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);
    return contract ? [{
        type: 'contract',
        data: contract.toJSON()
    }] : [];
};

/**
 * Searches for transaction or block by hash.
 * @param {number} workspaceId - The workspace ID
 * @param {string} hash - The hash to search for
 * @returns {Promise<Array>} Search results with type and data
 */
const searchForHash = async (workspaceId, hash) => {
    if (!workspaceId || !hash) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const transaction = await workspace.findTransaction(hash);
    if (transaction)
        return [{
            type: 'transaction',
            data: transaction.toJSON()
        }];
    else {
        const block = await workspace.findBlockByHash(hash);
        return block ? [{
            type: 'block',
            data: block.toJSON()
        }] : [];
    }
};

/**
 * Searches for a block by number.
 * @param {number} workspaceId - The workspace ID
 * @param {number} number - The block number to search for
 * @returns {Promise<Array>} Search results with type and data
 */
const searchForNumber = async (workspaceId, number) => {
    if (!workspaceId || !number) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const block = await workspace.findBlockByNumber(number, true);
    return block ? [{
        type: 'block',
        data: block.toJSON()
    }] : [];
};

/**
 * Searches for contracts by text (name, symbol, etc).
 * @param {number} workspaceId - The workspace ID
 * @param {string} text - The text to search for
 * @returns {Promise<Array>} Search results with type and data
 */
const searchForText = async (workspaceId, text) => {
    if (!workspaceId || !text) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contracts = await workspace.findContractsByText(text);
    return contracts.map(c => ({
        type: 'contract',
        data: c.toJSON()
    }));
};

/**
 * Gets a workspace by ID with user and explorer info.
 * @param {number} workspaceId - The workspace ID
 * @returns {Promise<Object>} The workspace object
 * @throws {Error} If workspace not found
 */
const getWorkspaceById = async (workspaceId) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['firebaseUserId']
            },
            'explorer'
        ]
    });

    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.toJSON();
};

/**
 * Gets a contract by ID within a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {number} contractId - The contract ID
 * @returns {Promise<Object|null>} The contract object or null
 */
const getWorkspaceContractById = async (workspaceId, contractId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractById(contractId);
    return contract ? contract.toJSON() : null;
};

/**
 * Gets a block by number within a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {number} number - The block number
 * @returns {Promise<Object>} The block object with Orbit batch info
 */
const getWorkspaceBlock = async (workspaceId, number) => {
    const attributes = [
        'id',
        'number',
        'timestamp',
        'baseFeePerGas',
        'gasUsed',
        'transactionsCount',
        'gasLimit',
        'hash',
        'miner',
        'extraData',
        'difficulty',
        'raw',
        'parentHash',
        [
            Sequelize.literal(`(
                SELECT COUNT(*)::INTEGER
                FROM transactions
                WHERE transactions."blockId" = "Block".id
                AND transactions.state = 'ready'
            )`), 'syncedTransactionCount'
        ]
    ];

    const orbitConfig = await OrbitChainConfig.findOne({ where: { workspaceId } });
    if (orbitConfig)
        attributes.push('orbitStatus');

    const block = await Block.findOne({
        where: { number, workspaceId },
        attributes, 
        include: {
            model: OrbitBatch,
            as: 'orbitBatch',
            attributes: [
                'id',
                'batchSequenceNumber',
                'confirmationStatus',
                'parentChainTxHash',
                'parentChainBlockNumber'
            ]
        }
    });

    return block.toJSON();
};

/**
 * Gets paginated blocks for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {number} [page=1] - Page number
 * @param {number} [itemsPerPage=10] - Items per page
 * @param {string} [order='DESC'] - Sort order
 * @returns {Promise<Object>} Paginated block results
 */
const getWorkspaceBlocks = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC') => {
    const workspace = await Workspace.findByPk(workspaceId);
    const blocks = await workspace.getFilteredBlocks(page, itemsPerPage, order);

    return {
        items: blocks.map(b => b.toJSON())
    };
};

/**
 * Gets a transaction by hash within a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {string} hash - The transaction hash
 * @returns {Promise<Object|null>} The transaction object or null
 */
const getWorkspaceTransaction = async (workspaceId, hash) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const transaction = await workspace.findTransaction(hash);

    return transaction ? transaction.toJSON() : null;
};

/**
 * Gets paginated transactions for a block.
 * @param {number} workspaceId - The workspace ID
 * @param {number} blockNumber - The block number
 * @param {number} [page=1] - Page number
 * @param {number} [itemsPerPage=10] - Items per page
 * @param {string} [order='DESC'] - Sort order
 * @param {string} [orderBy='timestamp'] - Field to order by
 * @param {string} [withCount='true'] - Whether to include total count
 * @returns {Promise<Object>} Paginated transaction results
 */
const getBlockTransactions = async (workspaceId, blockNumber, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'timestamp', withCount = 'true') => {
    if (!workspaceId || !blockNumber)
        throw new Error('Missing parameters');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const sanitizedOrderBy = ['hash', 'timestamp', 'value', 'from', 'to'].indexOf(orderBy) > -1 ? [orderBy] : ['timestamp'];

    const fun = withCount == 'false' ? 'findAll' : 'findAndCountAll';
    const res = await Transaction[fun]({
        where: { blockNumber, workspaceId },
        attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId', 'state'],
        include: [
            {
                model: Block,
                as: 'block',
                attributes: ['number'],
            },
            {
                model: TransactionReceipt,
                as: 'receipt',
                attributes: ['gasUsed', 'status', 'contractAddress', [Sequelize.json('raw.root'), 'root'], 'gasUsed', 'cumulativeGasUsed', [Sequelize.json('raw.effectiveGasPrice'), 'effectiveGasPrice']],
                include: {
                    model: Contract,
                    as: 'createdContract',
                    attributes: ['address', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'name', 'workspaceId'],
                    where: {
                        workspaceId: workspaceId
                    },
                    include: {
                        model: ContractVerification,
                        as: 'verification',
                        attributes: ['createdAt']
                    },
                    required: false
                }
            },
            {
                model: Contract,
                as: 'contract',
                attributes: ['tokenName', 'tokenSymbol', 'tokenDecimals', 'name'],
                include: {
                    model: ContractVerification,
                    as: 'verification',
                    attributes: ['createdAt']
                }
            }
        ],
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage,
        order: [[...sanitizedOrderBy, order]]
    });

    return res.rows && res.count !== null && res.count != undefined ? { ...res } : { rows: res };
}

/**
 * Gets paginated transactions for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {number} [page=1] - Page number
 * @param {number} [itemsPerPage=10] - Items per page
 * @param {string} [order='DESC'] - Sort order
 * @param {string} [orderBy='blockNumber'] - Field to order by
 * @param {string} [withCount='true'] - Whether to include total count
 * @returns {Promise<Object>} Paginated transaction results
 */
const getWorkspaceTransactions = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber', withCount = 'true') => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    let totalTransactionCount;
    if (withCount == 'true')
        totalTransactionCount = await workspace.countTransactions();

    const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy);

    return {
        items: transactions.map(t => t.toJSON()),
        total: totalTransactionCount
    };
};

/**
 * Gets paginated transactions for an address.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The address to get transactions for
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} order - Sort order
 * @param {string} orderBy - Field to order by
 * @returns {Promise<Object>} Paginated transaction results
 */
const getAddressTransactions = async (workspaceId, address, page, itemsPerPage, order, orderBy) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const transactions = await workspace.getFilteredTransactions(page, itemsPerPage, order, orderBy, address);
    const totalTransactionCount = await workspace.countTransactions({
        where: { [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }] }
    });
    return {
        items: transactions.map(t => t.toJSON()),
        total: totalTransactionCount
    };
};

/**
 * Gets paginated contracts for a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @param {string} [pattern] - Token pattern filter (erc20, erc721)
 * @returns {Promise<Object>} Paginated contract results
 */
const getWorkspaceContracts = async (workspaceId, page, itemsPerPage, orderBy, order, pattern) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const allowedPatterns = ['erc20', 'erc721'].indexOf(pattern) > -1 ? pattern : null;
    const contracts = await workspace.getFilteredContracts(page, itemsPerPage, orderBy, order, allowedPatterns);

    return { items: contracts.map(c => c.toJSON()) }
};

/**
 * Gets a contract by address within a workspace.
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The contract address
 * @returns {Promise<Object|null>} The contract object or null
 */
const getWorkspaceContract = async (workspaceId, address) => {
    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const contract = await workspace.findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

/**
 * Gets a user by database ID.
 * @param {number} id - The user ID
 * @returns {Promise<Object|null>} The user object or null
 */
const getUserById = async (id) => {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
};

/**
 * Gets a user by Firebase auth ID.
 * @param {string} id - The Firebase auth ID
 * @param {Array<string>} [extraFields=[]] - Extra fields to include
 * @returns {Promise<Object|null>} The user object or null
 */
const getUser = async (id, extraFields = []) => {
    const user = await User.findByAuthId(id, extraFields);
    return user ? user.toJSON() : null;
};

/**
 * Creates a new user.
 * @param {string} uid - The Firebase auth ID
 * @param {Object} data - User data
 * @param {string} data.email - User email
 * @param {string} data.apiKey - API key
 * @param {string} [data.stripeCustomerId] - Stripe customer ID
 * @param {string} [data.plan] - User plan
 * @returns {Promise<Object|null>} The created user or null
 */
const createUser = async (uid, data) => {
    if (!uid || !data) throw new Error('Missing parameter.');

    const user = await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan, data.explorerSubscriptionId, data.passwordHash, data.passwordSalt, data.qnId);
    return user ? user.toJSON() : null;
};

/**
 * Gets all workspaces for a user.
 * @param {string} userId - The Firebase auth ID
 * @returns {Promise<Array>} Array of workspace objects
 */
const getUserWorkspaces = async (userId) => {
    const user = await User.findByAuthId(userId);
    return user.workspaces.map(w => w.toJSON());
};

/**
 * Adds an integration to a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} integration - The integration name
 * @returns {Promise<void>}
 */
const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].addIntegration(integration);
};

/**
 * Removes an integration from a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} integration - The integration name
 * @returns {Promise<void>}
 */
const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].removeIntegration(integration);
};

/**
 * Creates a new workspace for a user.
 * @param {string} userId - The Firebase auth ID
 * @param {Object} data - Workspace data
 * @returns {Promise<Object|null>} The created workspace or null
 */
const createWorkspace = async (userId, data) => {
    if (!userId || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);
    const workspace = await user.safeCreateWorkspace(data);
    return workspace ? workspace.toJSON() : null;
};

/**
 * Gets a workspace by name for a user.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspaceName - The workspace name
 * @returns {Promise<Object|null>} The workspace object or null
 */
const getWorkspaceByName = async (userId, workspaceName) => {
    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    if (!user)
        return null;
    return user.workspaces && user.workspaces.length ? user.workspaces[0].toJSON() : null;
};

/**
 * Stores a block in a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {Object} block - Block data
 * @returns {Promise<Object|null>} The created block or null if exists
 */
const storeBlock = async (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const existingBlock = await user.workspaces[0].findBlockByNumber(block.number);

    if (existingBlock) {
        return null;
    }
    else {
        const newBlock = await user.workspaces[0].safeCreateBlock(block);
        return newBlock.toJSON();
    }
};

/**
 * Stores a transaction in a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {Object} transaction - Transaction data
 * @returns {Promise<Object|null>} The created transaction or null if exists
 * @throws {Error} If block not found
 */
const storeTransaction = async (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const block = await user.workspaces[0].findBlockByNumber(transaction.blockNumber);

    if (!block)
        throw new Error(`Couldn't find block`);

    const existingTransaction = await user.workspaces[0].findTransaction(transaction.hash);

    if (existingTransaction)
        return null;

    const newTransaction = await user.workspaces[0].safeCreateTransaction(transaction, block.id);
    return newTransaction.toJSON();
};

/**
 * Stores token transfers for a transaction.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} transactionHash - The transaction hash
 * @param {Array} tokenTransfers - Array of token transfer objects
 * @returns {Promise<void>}
 * @throws {Error} If transaction not found
 */
const storeTransactionTokenTransfers = async (userId, workspace, transactionHash, tokenTransfers) => {
    if (!userId || !workspace || !transactionHash || !tokenTransfers) throw new Error('Missing parameter.');

    if (tokenTransfers.length) {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(transactionHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        for (let i = 0; i < tokenTransfers.length; i++)
            await transaction.safeCreateTokenTransfer(tokenTransfers[i]);
    }
};

/**
 * Stores or updates contract data.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The contract address
 * @param {Object} data - Contract data
 * @param {Object} [transaction] - Optional database transaction
 * @returns {Promise<Object|null>} The contract object or null
 */
const storeContractData = async (userId, workspace, address, data, transaction) => {
    if (!userId || !workspace || !address || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data }, transaction);
    return contract ? contract.toJSON() : null;
};

/**
 * Gets a contract by user, workspace ID, and address.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The contract address
 * @returns {Promise<Object|null>} The contract object or null
 */
const getContract = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw new Error('Missing parameter.');

    const user = await User.findByPk(parseInt(userId));

    if (!user)
        return null;

    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

/**
 * Gets contract data by user, workspace name, and address.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The contract address
 * @returns {Promise<Object|null>} The contract object or null
 */
const getContractData = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

/**
 * Gets a contract by hashed bytecode.
 * @param {number} workspaceId - The workspace ID
 * @param {string} hashedBytecode - The hashed bytecode
 * @returns {Promise<Object|null>} The contract object or null
 */
const getContractByHashedBytecode = async (workspaceId, hashedBytecode) => {
    if (!workspaceId || !hashedBytecode) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const contract = await Contract.findOne({
        attributes: ['id', 'address', 'abi'],
        where: { workspaceId, hashedBytecode },
    });

    return contract ? contract.toJSON() : null;
};

/**
 * Stores an account's private key.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The account address
 * @param {string} privateKey - The private key (encrypted)
 * @returns {Promise<Object>} The account object
 */
const storeAccountPrivateKey = async (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, privateKey: privateKey });

    return account.toJSON();
};

/**
 * Gets paginated imported accounts for a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspaceName - The workspace name
 * @param {number} page - Page number
 * @param {number} itemsPerPage - Items per page
 * @param {string} orderBy - Field to order by
 * @param {string} order - Sort order
 * @returns {Promise<Object>} Paginated account results
 */
const getImportedAccounts = async (userId, workspaceName, page, itemsPerPage, orderBy, order) => {
    if (!userId || !workspaceName) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    const workspace = user.workspaces[0];

    const accounts = await workspace.getFilteredImportedAccounts(page, itemsPerPage, orderBy, order);
    const count = await workspace.countAccounts();

    return {
        items: accounts.map(a => a.toJSON()),
        total: count
    };
};

/**
 * Stores a transaction trace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} txHash - The transaction hash
 * @param {Object} trace - The trace data
 * @returns {Promise<Object>} The created trace
 * @throws {Error} If transaction not found
 */
const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transaction = await user.workspaces[0].findTransaction(txHash);

    if (!transaction)
        throw new Error(`Couldn't find transaction`);

    return transaction.safeCreateTransactionTrace(trace);
};

/**
 * Stores token balance changes for a transfer.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {number} tokenTransferId - The token transfer ID
 * @param {Array} changes - Array of balance change objects
 * @returns {Promise<void>}
 * @throws {Error} If token transfer not found
 */
const storeTokenBalanceChanges = async (userId, workspace, tokenTransferId, changes) => {
    if (!userId || !workspace || !tokenTransferId || !changes) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const tokenTransfer = (await user.workspaces[0].getTokenTransfers({
        where: { id :tokenTransferId }
    }))[0];

    if (!tokenTransfer)
        throw new Error(`Couldn't find token transfer`);

    return changes.forEach(async change => await tokenTransfer.safeCreateBalanceChange(change));
};

/**
 * Stores a failed transaction error message.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} transactionHash - The transaction hash
 * @param {Object} error - Error object with parsed and message fields
 * @returns {Promise<Object>} The updated transaction
 * @throws {Error} If transaction not found
 */
const storeFailedTransactionError = async (userId, workspace, transactionHash, error) => {
    if (!userId || !workspace || !transactionHash || !error) throw new Error('Missing parameter.');

    if (error) {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(transactionHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction`);

        await transaction.updateFailedTransactionError({
            parsed: error.parsed,
            message: error.message
        });

        return transaction.toJSON();
    }
};

/**
 * Updates an account's balance.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The account address
 * @param {string} balance - The new balance
 * @returns {Promise<Object>} The updated account
 */
const updateAccountBalance = async (userId, workspace, address, balance) => {
    if (!userId || !workspace || !address || !balance) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, balance: balance });

    return account.toJSON();
};

/**
 * Sets the current workspace for a user.
 * @param {string} userId - The Firebase auth ID
 * @param {string} name - The workspace name
 * @returns {Promise<Object>} The updated user
 */
const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, name);
    await user.update({ currentWorkspaceId: user.workspaces[0].id });

    return user.toJSON();
};

/**
 * Removes a contract from a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The contract address
 * @returns {Promise<void>}
 */
const removeContract = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].removeContractByAddress(address);
};

/**
 * Updates workspace settings.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {Object} settings - New settings object
 * @returns {Promise<Object>} The updated workspace
 */
const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const newWorkspace = await user.workspaces[0].updateSettings(settings);
    return newWorkspace.toJSON();
};

/**
 * Resets workspace data older than specified interval.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {number} [dayInterval] - Days to keep data
 * @returns {Promise<void>}
 */
const resetWorkspace = async (userId, workspace, dayInterval) => {
    if (!userId || !String(workspace)) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, String(workspace));
    if (user && user.workspaces.length)
        await user.workspaces[0].reset(dayInterval);
};

/**
 * Gets a user by Stripe customer ID.
 * @param {string} stripeCustomerId - The Stripe customer ID
 * @returns {Promise<Object|null>} The user object or null
 */
const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw new Error('Missing parameter.');

    const user = await User.findByStripeCustomerId(stripeCustomerId);
    return user ? user.toJSON() : null;
};

/**
 * Gets unprocessed contracts in a workspace.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @returns {Promise<Array>} Array of unprocessed contracts
 */
const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contracts = await user.workspaces[0].getUnprocessedContracts();
    return contracts.map(c => c.toJSON());
};

/**
 * Checks if a user has premium plan.
 * @param {string} userId - The Firebase auth ID
 * @returns {Promise<boolean>} True if user is premium
 */
const isUserPremium = async (userId) => {
    if (!userId) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);;
    return user.isPremium;
};

/**
 * Checks if a user can sync a contract.
 * Premium users and public workspaces can always sync.
 * Free users limited to 10 contracts.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspaceName - The workspace name
 * @param {string} address - The contract address
 * @returns {Promise<boolean>} True if user can sync
 */
const canUserSyncContract = async (userId, workspaceName, address) => {
    if (!userId) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);

    if (!user)
        return false;

    if (user.isPremium)
        return true;

    const workspace = user.workspaces[0];
    if (workspace.public)
        return true;

    // If the contract has already been synced we can update its data
    const existingContracts = await workspace.getContracts({ where: { address: address }});

    if (existingContracts.length > 0)
        return true;

    const contracts = await user.workspaces[0].getContracts();

    if (contracts.length >= 10)
        return false;
    else
        return true;
};

/**
 * Gets a transaction by hash.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} transactionHash - The transaction hash
 * @returns {Promise<Object>} The transaction object
 */
const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].findTransaction(transactionHash);
};

/**
 * Gets transactions that need processing.
 * @param {string} uid - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @returns {Promise<Array>} Array of processable transactions
 */
const getProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

/**
 * Gets failed transactions that can be reprocessed.
 * @param {string} uid - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @returns {Promise<Array>} Array of failed processable transactions
 */
const getFailedProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getFailedProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

/**
 * Gets public explorer parameters by slug.
 * @param {string} slug - The explorer slug
 * @returns {Promise<Object|null>} The explorer object or null
 */
const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw new Error('Missing parameter.');

   const explorer = await Explorer.findBySlug(slug);
   return explorer ? explorer.toJSON() : null;
};

/**
 * Gets public explorer parameters by domain.
 * @param {string} domain - The explorer domain
 * @returns {Promise<Object|null>} The explorer object or null
 */
const getPublicExplorerParamsByDomain = async (domain) => {
   if (!domain) throw new Error('Missing parameter.');

   const explorer = await Explorer.findByDomain(domain);
   return explorer ? explorer.toJSON() : null;
};

/**
 * Gets the deployment transaction for a contract.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @param {string} address - The contract address
 * @returns {Promise<Object|null>} The deployment transaction or null
 */
const getContractDeploymentTxByAddress = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw new Error('Missing parameter.');

    const user = await User.findByPk(userId);

    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const transactions = await workspaces[0].getTransactions({
        where: { '$receipt.contractAddress$': address },
        include: 'receipt'
    });
    return transactions && transactions.length ? transactions[0].toJSON() : null;
};

/**
 * Updates contract verification status.
 * @param {number} userId - The user ID
 * @param {number} workspaceId - The workspace ID
 * @param {string} contractAddress - The contract address
 * @param {string} status - Status: 'success', 'pending', or 'failed'
 * @returns {Promise<Object|null>} The updated contract or null
 */
const updateContractVerificationStatus = async (userId, workspaceId, contractAddress, status) => {
    if (!userId || !workspaceId || !contractAddress || !status) throw new Error('Missing parameter.');

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return null;

    const user = await User.findByPk(userId);
    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(contractAddress);
    await contract.update({ verificationStatus: status });
    return contract.toJSON();
};

/**
 * Updates a user's subscription plan.
 * @param {string} userId - The Firebase auth ID
 * @param {string} plan - The plan: 'free' or 'premium'
 * @returns {Promise<Object>} The updated user
 * @throws {Error} If plan is invalid
 */
const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw new Error('Missing parameter.');

    if (['free', 'premium'].indexOf(plan) === -1)
        throw new Error('[updateUserPlan] Invalid plan');

    const user = await User.findByAuthId(userId);
    await user.update({ plan: plan });
    return user.toJSON();
};

/**
 * Gets transactions for a contract address.
 * @param {string} userId - The Firebase auth ID
 * @param {string} workspace - The workspace name
 * @param {string} address - The contract address
 * @returns {Promise<Array>} Array of transactions with receipts
 */
const getContractTransactions = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transactions = await user.workspaces[0].getTransactions({
        where: { to: address },
        include: {
            model: TransactionReceipt,
            as: 'receipt',
            include: 'logs'
        }
    });
    return transactions.map(t => t.toJSON());
}

/**
 * Fetches DEX trading pairs with their latest reserves.
 * @param {number} explorerV2DexId - The DEX ID
 * @param {number} [page=1] - Page number
 * @param {number} [itemsPerPage=10] - Items per page
 * @param {string} [order='DESC'] - Sort order
 * @returns {Promise<Object>} Paginated pair results
 */
const fetchPairsWithLatestReserves = async (explorerV2DexId, page = 1, itemsPerPage = 10, order = 'DESC') => {
    if (!explorerV2DexId)
        throw new Error('Missing parameter.');

    const explorerV2Dex = await ExplorerV2Dex.findByPk(explorerV2DexId);
    if (!explorerV2Dex)
        throw new Error('Could not find dex');

    return explorerV2Dex.getPairsWithLatestReserves(page, itemsPerPage, order);
};

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    getContractData: getContractData,
    getWorkspaceByName: getWorkspaceByName,
    getUser: getUser,
    addIntegration: addIntegration,
    removeIntegration: removeIntegration,
    storeAccountPrivateKey: storeAccountPrivateKey,
    storeTrace: storeTrace,
    getContractByHashedBytecode: getContractByHashedBytecode,
    createWorkspace: createWorkspace,
    updateAccountBalance: updateAccountBalance,
    setCurrentWorkspace: setCurrentWorkspace,
    updateWorkspaceSettings: updateWorkspaceSettings,
    getUserbyStripeCustomerId: getUserbyStripeCustomerId,
    getUserWorkspaces: getUserWorkspaces,
    createUser: createUser,
    getUnprocessedContracts: getUnprocessedContracts,
    canUserSyncContract: canUserSyncContract,
    isUserPremium: isUserPremium,
    getContractTransactions: getContractTransactions,
    storeTokenBalanceChanges: storeTokenBalanceChanges,
    storeTransactionTokenTransfers: storeTransactionTokenTransfers,
    getTransaction: getTransaction,
    getPublicExplorerParamsBySlug: getPublicExplorerParamsBySlug,
    getContractDeploymentTxByAddress: getContractDeploymentTxByAddress,
    updateContractVerificationStatus: updateContractVerificationStatus,
    storeFailedTransactionError: storeFailedTransactionError,
    updateUserPlan: updateUserPlan,
    resetWorkspace: resetWorkspace,
    getWorkspaceBlocks: getWorkspaceBlocks,
    getWorkspaceBlock: getWorkspaceBlock,
    getWorkspaceTransactions: getWorkspaceTransactions,
    getWorkspaceTransaction: getWorkspaceTransaction,
    getAddressTransactions: getAddressTransactions,
    removeContract: removeContract,
    getWorkspaceContracts: getWorkspaceContracts,
    getWorkspaceContract: getWorkspaceContract,
    getWorkspaceById: getWorkspaceById,
    getWorkspaceContractById: getWorkspaceContractById,
    getUserById: getUserById,
    getContract: getContract,
    getPublicExplorerParamsByDomain: getPublicExplorerParamsByDomain,
    getProcessableTransactions: getProcessableTransactions,
    getFailedProcessableTransactions: getFailedProcessableTransactions,
    searchForAddress: searchForAddress,
    searchForHash: searchForHash,
    searchForNumber: searchForNumber,
    searchForText: searchForText,
    getAddressLatestTokenBalances: getAddressLatestTokenBalances,
    getTotalTxCount: getTotalTxCount,
    getActiveWalletCount: getActiveWalletCount,
    getTransactionVolume: getTransactionVolume,
    setWorkspaceRemoteFlag: setWorkspaceRemoteFlag,
    storeErc721Token: storeErc721Token,
    getContractErc721Tokens: getContractErc721Tokens,
    getContractErc721Token: getContractErc721Token,
    getErc721TokenTransfers: getErc721TokenTransfers,
    updateErc721Token: updateErc721Token,
    getContractByWorkspaceId: getContractByWorkspaceId,
    storeContractDataWithWorkspaceId: storeContractDataWithWorkspaceId,
    getContractLogs: getContractLogs,
    getTokenTransfers: getTokenTransfers,
    getTokenStats: getTokenStats,
    getTokenHolders: getTokenHolders,
    getTokenTransferVolume: getTokenTransferVolume,
    getTokenCirculatingSupply: getTokenCirculatingSupply,
    getTokenHolderHistory: getTokenHolderHistory,
    getTokenTransferForProcessing: getTokenTransferForProcessing,
    getTransactionTokenTransfers: getTransactionTokenTransfers,
    getAddressTransactionStats: getAddressTransactionStats,
    getAddressTokenTransfers: getAddressTokenTransfers,
    getCustomTransactionFunction: getCustomTransactionFunction,
    getUserByEmail: getUserByEmail,
    setUserPassword: setUserPassword,
    updateUserFirebaseHash: updateUserFirebaseHash,
    updateBrowserSync: updateBrowserSync,
    createExplorer: createExplorer,
    syncFullBlock: syncFullBlock,
    syncPartialBlock: syncPartialBlock,
    getTransactionForProcessing: getTransactionForProcessing,
    updateWorkspaceIntegrityCheck: updateWorkspaceIntegrityCheck,
    updateWorkspaceRpcHealthCheck: updateWorkspaceRpcHealthCheck,
    revertPartialBlock: revertPartialBlock,
    getUserExplorers: getUserExplorers,
    getExplorerById: getExplorerById,
    updateExplorerSettings: updateExplorerSettings,
    updateExplorerWorkspace: updateExplorerWorkspace,
    updateExplorerBranding: updateExplorerBranding,
    getStripePlan: getStripePlan,
    storeContractVerificationData: storeContractVerificationData,
    getExplorerPlans: getExplorerPlans,
    createExplorerSubscription: createExplorerSubscription,
    updateExplorerSubscription: updateExplorerSubscription,
    cancelExplorerSubscription: cancelExplorerSubscription,
    deleteExplorerSubscription: deleteExplorerSubscription,
    getContractById: getContractById,
    revertExplorerSubscriptionCancelation: revertExplorerSubscriptionCancelation,
    createExplorerFromWorkspace: createExplorerFromWorkspace,
    deleteExplorer: deleteExplorer,
    createExplorerDomain: createExplorerDomain,
    deleteExplorerDomain: deleteExplorerDomain,
    getExplorerDomainById: getExplorerDomainById,
    disableUserTrial: disableUserTrial,
    storeTransactionReceipt: storeTransactionReceipt,
    getBlockTransactions: getBlockTransactions,
    deleteWorkspace: deleteWorkspace,
    canUserSyncBlock: canUserSyncBlock,
    resetFailedAttempts: resetFailedAttempts,
    incrementFailedAttempts: incrementFailedAttempts,
    stopExplorerSync: stopExplorerSync,
    startExplorerSync: startExplorerSync,
    createExplorerWithWorkspace: createExplorerWithWorkspace,
    migrateDemoExplorer: migrateDemoExplorer,
    makeExplorerDemo: makeExplorerDemo,
    resetExplorerTransactionQuota: resetExplorerTransactionQuota,
    workspaceNeedsBatchReset: workspaceNeedsBatchReset,
    getAverageGasPrice: getAverageGasPrice,
    getAverageTransactionFee: getAverageTransactionFee,
    getUniqueWalletCount: getUniqueWalletCount,
    getCumulativeWalletCount: getCumulativeWalletCount,
    getDeployedContractCount: getDeployedContractCount,
    getCumulativeDeployedContractCount: getCumulativeDeployedContractCount,
    findQuicknodeUser: findQuicknodeUser,
    findQuicknodeWorkspace: findQuicknodeWorkspace,
    findQuicknodeExplorer: findQuicknodeExplorer,
    updateQuicknodeSubscription: updateQuicknodeSubscription,
    createQuicknodeWorkspace: createQuicknodeWorkspace,
    markWorkspaceForDeletion: markWorkspaceForDeletion,
    getTransactionLogs: getTransactionLogs,
    createStripeQuotaExtension: createStripeQuotaExtension,
    updateStripeQuotaExtension: updateStripeQuotaExtension,
    destroyStripeQuotaExtension: destroyStripeQuotaExtension,
    getQuotaExtensionPlan: getQuotaExtensionPlan,
    getStripeSubscription: getStripeSubscription,
    createFaucet: createFaucet,
    updateFaucet: updateFaucet,
    getFaucet: getFaucet,
    activateFaucet: activateFaucet,
    deactivateFaucet: deactivateFaucet,
    getFaucetCooldown: getFaucetCooldown,
    getFaucetPrivateKey: getFaucetPrivateKey,
    createFaucetDrip: createFaucetDrip,
    getExplorerFaucet: getExplorerFaucet,
    deleteFaucet: deleteFaucet,
    ownFaucet: ownFaucet,
    getFaucetRequestVolume: getFaucetRequestVolume,
    getFaucetTokenVolume: getFaucetTokenVolume,
    getFaucetTransactionHistory: getFaucetTransactionHistory,
    createExplorerV2Dex: createExplorerV2Dex,
    createV2DexPair: createV2DexPair,
    getExplorerV2Dex: getExplorerV2Dex,
    createExplorerFromOptions: createExplorerFromOptions,
    getV2DexQuote: getV2DexQuote,
    fetchPairsWithLatestReserves: fetchPairsWithLatestReserves,
    deactivateV2Dex: deactivateV2Dex,
    activateV2Dex: activateV2Dex,
    deleteV2Dex: deleteV2Dex,
    getV2DexPairCount: getV2DexPairCount,
    getUserStripeSubscription: getUserStripeSubscription,
    createUserStripeSubscription: createUserStripeSubscription,
    getLatestGasStats: getLatestGasStats,
    getGasPriceHistory: getGasPriceHistory,
    getGasLimitHistory: getGasLimitHistory,
    getGasUtilizationRatioHistory: getGasUtilizationRatioHistory,
    getLatestGasConsumers: getLatestGasConsumers,
    getLatestGasSpenders: getLatestGasSpenders,
    getBlockTimeHistory: getBlockTimeHistory,
    getBlockSizeHistory: getBlockSizeHistory,
    replaceWorkspace: replaceWorkspace,
    getTransactionFeeHistory: getTransactionFeeHistory,
    getLast24hAverageTransactionFee: getLast24hAverageTransactionFee,
    getLast24hTransactionFees: getLast24hTransactionFees,
    getLast24hGasUtilisationRatio: getLast24hGasUtilisationRatio,
    getLast24hTotalGasUsed: getLast24hTotalGasUsed,
    getLast24hBurntFees: getLast24hBurntFees,
    getAddressTransactionTraceSteps: getAddressTransactionTraceSteps,
    countAddressTransactionTraceSteps: countAddressTransactionTraceSteps,
    getAddressTransactionHistory: getAddressTransactionHistory,
    getAddressSpentTransactionFeeHistory: getAddressSpentTransactionFeeHistory,
    getAddressTokenTransferHistory: getAddressTokenTransferHistory,
    getTransactionTokenBalanceChanges: getTransactionTokenBalanceChanges,
    getWorkspaceTransactionTraceSteps: getWorkspaceTransactionTraceSteps,
    getTransactionTraceSteps: getTransactionTraceSteps,
    getVerifiedContracts: getVerifiedContracts,
    getWorkspaceContractStats: getWorkspaceContractStats,
    getWorkspaceTokenTransfers: getWorkspaceTokenTransfers,
    getTopTokensByHolders: getTopTokensByHolders,
    createAdmin: createAdmin,
    canSetupAdmin: canSetupAdmin,
    isValidExplorerDomain: isValidExplorerDomain,
    getImportedAccounts: getImportedAccounts,
    getFilteredNativeAccounts: getFilteredNativeAccounts,
    getWorkspaceOrbitBatches: getWorkspaceOrbitBatches,
    getOrbitBatch: getOrbitBatch,
    getOrbitBatchBlocks: getOrbitBatchBlocks,
    getWorkspaceOrbitBatchTransactions: getWorkspaceOrbitBatchTransactions,
    getWorkspaceOrbitWithdrawals: getWorkspaceOrbitWithdrawals,
    getL2TransactionOrbitWithdrawals: getL2TransactionOrbitWithdrawals,
    getL2TransactionForOrbitWithdrawalClaim: getL2TransactionForOrbitWithdrawalClaim,
    getWorkspaceOrbitDeposits: getWorkspaceOrbitDeposits,
    updateOrbitConfig: updateOrbitConfig,
    getOrbitConfig: getOrbitConfig,
    createOrbitConfig: createOrbitConfig,
    updateOpConfig: updateOpConfig,
    getOpConfig: getOpConfig,
    createOpConfig: createOpConfig,
    getAvailableOpParents: getAvailableOpParents,
    getWorkspaceOpBatches: getWorkspaceOpBatches,
    getOpBatch: getOpBatch,
    getOpBatchTransactions: getOpBatchTransactions,
    getWorkspaceOpOutputs: getWorkspaceOpOutputs,
    getOpOutput: getOpOutput,
    getWorkspaceOpDeposits: getWorkspaceOpDeposits,
    getOpDepositByL1Hash: getOpDepositByL1Hash,
    getWorkspaceOpWithdrawals: getWorkspaceOpWithdrawals,
    getOpWithdrawalByL2Hash: getOpWithdrawalByL2Hash,
    getOpWithdrawalProof: getOpWithdrawalProof
};
