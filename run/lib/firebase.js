/*
    This file contains all the methods to interact with
    models from the API. They check for parameters,
    make sure the required resources exist and can
    be accessed by the user.
    APIs should use methods from this file and not interact
    with the models directly.
    Background jobs do not need to use methods here and
    can interact with the models directly, as they are not
    exposed to the user.
*/
const Sequelize = require('sequelize');
const { getDemoUserId, getMaxBlockForSyncReset } = require('./env');
const models = require('../models');
const { firebaseHash }  = require('./crypto');

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

/*
    Returns the number of token transfers for an address in a given time range.

    @param {number} workspaceId (mandatory) - The ID of the workspace
    @param {string} address (mandatory) - The address to get the token transfer history for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The number of token transfers for the address in the given time range
*/
const getAddressTokenTransferHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTokenTransferHistory(address, from, to);
};

/*
    Returns the amount of transaction fees spent by an address in a given time range.

    @param {number} workspaceId (mandatory) - The ID of the workspace
    @param {string} address (mandatory) - The address to get the transaction fees for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The amount of transaction fees spent by the address in the given time range
*/
const getAddressSpentTransactionFeeHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressSpentTransactionFeeHistory(address, from, to);
};

/*
    Returns the number of transactions for an address in a given time range.

    @param {number} workspaceId (mandatory) - The ID of the workspace
    @param {string} address (mandatory) - The address to get the number of transactions for
    @param {string} from (mandatory) - The start date
    @param {string} to (mandatory) - The end date
    @returns {Array} - The number of transactions for the address in the given time range
*/
const getAddressTransactionHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTransactionHistory(address, from, to);
};

/*
    Returns the number of transaction steps for an address.

    @param {number} workspaceId (mandatory) - The ID of the workspace
    @param {string} address (mandatory) - The address to get the number of transaction steps for
    @returns {number} - The number of transaction steps for the address
*/
const countAddressTransactionTraceSteps = async (workspaceId, address) => {
    if (!workspaceId || !address)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.countAddressTransactionTraceSteps(address);
};

/*
    Returns all internal transactions involving an address. 

    @param {number} workspaceId (mandatory) - The ID of the workspace
    @param {string} address (mandatory) - The address to get the internal transactions for
    @param {number} page (optional) - The page number
    @param {number} itemsPerPage (optional) - The number of items per page
*/
const getAddressTransactionTraceSteps = async (workspaceId, address, page, itemsPerPage) => {
    if (!workspaceId || !address)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getAddressTransactionTraceSteps(address, page, itemsPerPage);
};

/*
    This method is used to get the burnt fees for the last 24 hours for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @returns {number} - The burnt fees for the last 24 hours
*/
const getLast24hBurntFees = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hBurntFees();
};

/*
    This method is used to get the total gas used for the last 24 hours for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @returns {number} - The total gas used for the last 24 hours
*/
const getLast24hTotalGasUsed = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hTotalGasUsed();
};

/*
    This method is used to get the gas utilization ratio for the last 24 hours for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @returns {number} - The gas utilization ratio for the last 24 hours
*/
const getLast24hGasUtilisationRatio = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hGasUtilisationRatio();
};

/*
    This method is used to get the average transaction fee for the last 24 hours for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @returns {number} - The average transaction fee for the last 24 hours
*/
const getLast24hAverageTransactionFee = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hAverageTransactionFee();
};

/*
    This method is used to get the total transaction fees for the last 24 hours for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @returns {number} - The total transaction fees for the last 24 hours
*/
const getLast24hTransactionFees = async (workspaceId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLast24hTransactionFees();
};

/*
    This method is used to get the total transaction fees for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - Start day
    @param {string} to - End day
    @returns {array} - The transaction fees
        - day: The day of the transaction fees
        - transactionFees: The total transaction fees for the day
*/
const getTransactionFeeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionFeeHistory(from, to);
};

/*
    workspace.replace() is used to replace a workspace.
    We use this when we want to reset an explorer.
    Waiting for the data to be deleted can take a long time,
    so we replace the workspace with a new one, and delete the old one in the background.

    This method safely calls workspace.replace() by making sure
    the user is the owner of the workspace.

    @param {number} userId - The ID of the user
    @param {number} workspaceId - The ID of the workspace
    @returns {object} - The duplicated (new) workspace
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

/*
    This method is used to get the block size history for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - The start date of the block size history
    @param {string} to - The end date of the block size history
    @returns {array} - The block size history
        - day: The day of the block size history
        - size: The average block size for the day
*/
const getBlockSizeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getBlockSizeHistory(from, to);
};

/*
    This method is used to get the block time history for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - The start date of the block time history
    @param {string} to - The end date of the block time history
    @returns {array} - The block time history
        - day: The day of the block time history
        - blockTime: The average block time for the day
*/
const getBlockTimeHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getBlockTimeHistory(from, to);
};

/*
    This method is used to get the latest biggest gas spenders for a workspace
    for a given interval (now - intervalInHours).

    @param {number} workspaceId - The ID of the workspace
    @param {number} intervalInHours - The interval in hours to get the gas spenders for
    @param {number} limit - The limit of gas spenders to return
    @returns {array} - The gas spenders
        - from: The address of the gas spender
        - gasUsed: The total gas used by the gas spender
        - gasCost: Cost of total gas used
        - percentUsed: The percentage of total gas used by the gas spender
*/
const getLatestGasSpenders = async (workspaceId, intervalInHours = 24, limit = 50) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasSpenders(intervalInHours, limit);
};

/*
    This method is used to get the latest biggest gas consumers for a workspace
    for a given interval (now - intervalInHours).

    @param {number} workspaceId - The ID of the workspace
    @param {number} intervalInHours - The interval in hours to get the gas consumers for
    @param {number} limit - The limit of gas consumers to return
    @returns {array} - The gas consumers
        - to: The address of the gas consumer
        - gasUsed: The total gas used by the gas consumer
        - gasCost: Cost of total gas used
*/
const getLatestGasConsumers = async (workspaceId, intervalInHours = 24, limit = 50) => {
    if (!workspaceId)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasConsumers(intervalInHours, limit);
};

/*
    This method is used to get the gas utilization ratio history for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - The start date of the gas utilization ratio history
    @param {string} to - The end date of the gas utilization ratio history
    @returns {array} - The gas utilization ratio history
        - day: The day of the gas utilization ratio history
        - gasUtilizationRatio: The average gas utilization ratio for the day
*/
const getGasUtilizationRatioHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasUtilizationRatioHistory(from, to);
};

/*
    This method is used to get the gas limit history for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - The start date of the gas limit history
    @param {string} to - The end date of the gas limit history
    @returns {array} - The gas limit history
        - day: The day of the gas limit history
        - gasLimit: The average gas limit for the day
*/
const getGasLimitHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasLimitHistory(from, to);
};

/*
    This method is used to get the gas price history for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {string} from - The start date of the gas price history
    @param {string} to - The end date of the gas price history
    @returns {array} - The gas price history
        - day: The day of the gas price history
        - minSlow: The minimum slow gas price
        - slow: The average slow gas price
        - maxSlow: The maximum slow gas price
        - minAverage: The minimum average gas price
        - average: The average average gas price
        - maxAverage: The maximum average gas price
        - minFast: The minimum fast gas price
        - fast: The average fast gas price
        - maxFast: The maximum fast gas price
*/
const getGasPriceHistory = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getGasPriceHistory(from, to);
};

/*
    This method is used to get the latest gas stats for a workspace.

    @param {number} workspaceId - The ID of the workspace
    @param {number} intervalInMinutes - The interval in minutes to get the gas stats for
    @returns {object} - The gas stats object
        - averageBlockSize: The average block size in transactions
        - averageUtilization: The average quantity of gas used per block
        - averageBlockTime: The average block time in seconds
        - latestBlockNumber: The number of the latest block used for this calculation
        - baseFeePerGas: The base fee per gas for the latest block
        - priorityFeePerGas: The three levels of priority fee per gas for the latest block (slow, average, fast)
*/
const getLatestGasStats = async (workspaceId, intervalInMinutes = 1) => {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getLatestGasStats(intervalInMinutes);
};

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

const getUserStripeSubscription = (userId) => {
    if (!userId)
        throw new Error('Missing parameter');

    return StripeSubscription.findOne({
        where: { userId }
    });
};

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

const getV2DexQuote = async (v2DexId, from, to, amount, direction, slippageTolerance) => {
    if (!v2DexId || !from || !to || !amount)
        throw new Error('Missing parameter');

    const dex = await ExplorerV2Dex.findByPk(v2DexId);
    if (!dex)
        throw new Error('Could not find dex');

    return dex.getQuote(from, to, amount, direction, slippageTolerance);
};

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

const createV2DexPair = async (dexId, token0, token1, pair) => {
    if (!dexId || !token0 || !token1 ||!pair)
        throw new Error('Missing parameter');
    
    const dex = await ExplorerV2Dex.findByPk(dexId);
    if (!dex)
        throw new Error('Could not find dex');

    return dex.safeCreatePair(token0, token1, pair);
};

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

const createExplorerFromOptions = async (userId, options) => {
    if (!userId || !options)
        throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Could not find user');

    return user.createExplorerFromOptions(options);
};

const getFaucetTransactionHistory = async (faucetId, page, itemsPerPage, order, orderBy) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getTransactionHistory(page, itemsPerPage, order, orderBy);
};

const getFaucetTokenVolume = async (faucetId, from, to) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getTokenVolume(from, to);
};

const getFaucetRequestVolume = async (faucetId, from, to) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error('Could not find faucet');

    return faucet.getRequestVolume(from, to);
};

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

const getExplorerFaucet = async (explorerId) => {
    if (!explorerId)
        throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Could not find explorer');

    return explorer.getFaucet();
};

const createFaucetDrip = async (faucetId, address, amount, transactionHash) => {
    if (!faucetId || !address || !amount || !transactionHash)
        throw new Error('Missing parameter');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error(`Can't find faucet`);

    return faucet.safeCreateDrip(address, amount, transactionHash);
};

const getFaucetPrivateKey = async (faucetId) => {
    if (!faucetId)
        throw new Error('Missing parameter');

    const { privateKey } = await ExplorerFaucet.findByPk(faucetId);
    return privateKey;
};

const getFaucetCooldown = async (faucetId, address) => {
    if (!faucetId || !address)
        throw new Error('Missing parameters');

    const faucet = await ExplorerFaucet.findByPk(faucetId);
    if (!faucet)
        throw new Error(`Can't find faucet`);

    return faucet.getCooldown(address);
};

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

const getStripeSubscription = async (explorerId) => {
    if (!explorerId)
        throw new Error('Missing parameter');

    return StripeSubscription.findOne({
        where: { explorerId },
        include: 'stripePlan'
    });
};

const getQuotaExtensionPlan = () => {
    return StripePlan.findOne({
        where: {
            'capabilities.quotaExtension': true
        },
        attributes: ['capabilities', 'slug']
    })
};

const destroyStripeQuotaExtension = async (stripeSubscriptionId) => {
    if (!stripeSubscriptionId)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeDestroyStripeQuotaExtension();
};

const updateStripeQuotaExtension = async (stripeSubscriptionId, quota) => {
    if (!stripeSubscriptionId || !quota)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeUpdateStripeQuotaExtension(quota);
};

const createStripeQuotaExtension = async (stripeSubscriptionId, stripeId, stripePlanId, quota) => {
    if (!stripeSubscriptionId || !stripeId || !stripePlanId || !quota)
        throw new Error('Missing parameter');

    const stripeSubscription = await StripeSubscription.findByPk(stripeSubscriptionId);
    if (!stripeSubscription)
        throw new Error('Could not find Stripe subscription');

    return stripeSubscription.safeCreateStripeQuotaExtension(stripeId, stripePlanId, quota);
};

const getTransactionLogs = async (workspaceId, hash, page, itemsPerPage) => {
    if (!workspaceId || !hash)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const { count, rows: logs } = await workspace.getTransactionLogs(hash, page, itemsPerPage);

    return { count, logs };
};

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

const makeExplorerDemo = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ isDemo: true });
};

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

const createExplorerWithWorkspace = async (userId, workspaceData) => {
    if (!workspaceData) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);
    if (!user)
        throw new Error('Cannot find user');

    return user.safeCreateWorkspaceWithExplorer(workspaceData);
};

const stopExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: false });
};

const startExplorerSync = async (explorerId) => {
    if (!explorerId) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.update({ shouldSync: true });
};

const resetFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.resetFailedAttempts();
};

const incrementFailedAttempts = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId, {
        include: 'rpcHealthCheck'
    });

    if (!workspace || !workspace.rpcHealthCheck)
        return null;

    return workspace.rpcHealthCheck.incrementFailedAttempts();
};

const canUserSyncBlock = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId, {
        include: 'workspaces'
    });

    if (!user.isPremium && user.workspaces.length > 1)
        return false;

    return true;
};

const deleteWorkspace = async (userId, workspaceId) => {
    if (!userId || !workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace || workspace.userId != userId)
        throw new Error('Cannot find workspace');

    return workspace.safeDelete();
};

const storeTransactionReceipt = async (transactionId, receipt) => {
    if (!transactionId || !receipt) throw new Error('Missing parameter');

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction)
        throw new Error('Cannot find transaction');

    return transaction.safeCreateReceipt(receipt);
};

const disableUserTrial = async (userId) => {
    if (!userId) throw new Error('Missing parameter');

    const user = await User.findByPk(userId);

    if (!user)
        throw new Error('Cannot find user');

    return user.disableTrialMode();
};

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

const createExplorerDomain = async (explorerId, domain) => {
    if (!explorerId || !domain) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeCreateDomain(domain);
};

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

const getContractById = async (contractId) => {
    if (!contractId) throw new Error('Missing parameter');

    const contract = await Contract.findByPk(contractId);

    return contract ? contract.toJSON() : null;
};

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

const getExplorerPlans = () => {
    return StripePlan.findAll({
        where: { public: true },
        attributes: ['capabilities', 'id', 'name', 'slug', 'stripePriceId', 'price'],
        order: [['id']]
    });
};

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

const getStripePlan = async (slug) => {
    const plan = await StripePlan.findOne({
        where: { slug }
    });
    return plan ? plan.toJSON() : null;
}

const updateExplorerBranding = async (explorerId, branding) => {
    if (!explorerId || !branding) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);

    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateBranding(branding);
};

const updateExplorerSettings = async (explorerId, settings) => {
    if (!explorerId || !settings) throw new Error('Missing parameter');

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer)
        throw new Error('Cannot find explorer');

    return explorer.safeUpdateSettings(settings);
};

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

const updateWorkspaceRpcHealthCheck = async (workspaceId, isReachable) => {
    if (!workspaceId || isReachable === null || isReachable === undefined) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateRpcHealthCheck(isReachable);
};

const updateWorkspaceIntegrityCheck = async (workspaceId, { blockId, status }) => {
    if (!workspaceId || (!blockId && !status)) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.safeCreateOrUpdateIntegrityCheck({ blockId, status });
};

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

const revertPartialBlock = async (blockId) => {
    if (!blockId) throw new Error('Missing parameter.');

    const block = await Block.findByPk(blockId);

    return block ? block.revertIfPartial() : null;
};

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

const updateBrowserSync = async (workspaceId, newValue) => {
    if (!workspaceId || newValue === undefined || newValue === null)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    return workspace.update({ browserSyncEnabled: newValue });
};

const updateUserFirebaseHash = async (email, passwordSalt, passwordHash) => {
    if (!email || !passwordSalt || !passwordHash)
        throw new Error('Missing parameter');

    const user = await User.findOne({ where: { email: email }});

    return user.update({ passwordSalt, passwordHash });
};

const setUserPassword = async (email, password) => {
    if (!email || !password)
        throw new Error('Missig parameter');

    const user = await User.findOne({ where: { email: email }});

    if (!user)
        throw new Error(`Can't find user with this email address.`);

    const { passwordHash, passwordSalt } = await firebaseHash(password);

    return user.update({ passwordHash, passwordSalt });
};

const getUserByEmail = async (email) => {
    const user = await User.findOne({ where: { email: email }, include: 'currentWorkspace' });
    return user ? user.toJSON() : null;
};

const getCustomTransactionFunction = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);

    return await workspace.getCustomTransactionFunction();
};

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

const getTokenHolderHistory = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenHolderHistory(from, to);
};

const getTokenCirculatingSupply = async (workspaceId, address, from, to) => {
    if (!workspaceId || !address || !from || !to) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address`);

    return contract.getTokenCirculatingSupply(from, to);
};

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

const getTokenTransfers = async (workspaceId, address, page, itemsPerPage, orderBy, order, fromBlock) => {
    if (!workspaceId || !address) throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    if (!contract)
        throw new Error(`Can't find contract at this address.`);

    const rows = await contract.getTokenTransfers(page, itemsPerPage, orderBy, order, fromBlock);

    return { items: rows.map(t => t.toJSON()) };
};

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

const getContractByWorkspaceId = async (workspaceId, address) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getErc721TokenTransfers = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    if (!contract)
        return [];

    const transfers = await contract.getErc721TokenTransfersByTokenId(tokenId);

    return transfers.map(t => t.toJSON());
};

const updateErc721Token = async (workspaceId, contractAddress, index, fields) => {
    if (!workspaceId || !contractAddress || !index || !fields) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeUpdateErc721Token(index, fields);
};

const getContractErc721Token = async (workspaceId, contractAddress, tokenId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    const token = await contract.getErc721Token(tokenId);

    return token ? token.toJSON() : null;
};

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

const storeErc721Token = async (workspaceId, contractAddress, token) => {
    if (!workspaceId || !contractAddress || !token) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(contractAddress);

    return contract.safeCreateOrUpdateErc721Token(token);
};

const setWorkspaceRemoteFlag = async (workspaceId, flag) => {
    const workspace = await Workspace.findByPk(workspaceId);

    return workspace.update({ isRemote: flag });
};

const getCumulativeDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeDeployedContractCount = await workspace.getCumulativeDeployedContractCount(from, to);
    return cumulativeDeployedContractCount;
};

const getDeployedContractCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const deployedContractCount = await workspace.getDeployedContractCount(from, to);
    return deployedContractCount;
};

const getUniqueWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const uniqueWalletCount = await workspace.getUniqueWalletCount(from, to);
    return uniqueWalletCount;
};

const getCumulativeWalletCount = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const cumulativeWalletCount = await workspace.getCumulativeWalletCount(from, to);
    return cumulativeWalletCount;
};

const getAverageGasPrice = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgGasPrice = await workspace.getAverageGasPrice(from, to);
    return avgGasPrice;
};

const getAverageTransactionFee = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const avgTransactionFee = await workspace.getAverageTransactionFee(from, to);
    return avgTransactionFee;
};

const getTransactionVolume = async (workspaceId, from, to) => {
    if (!workspaceId || !from || !to) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    const transactions = await workspace.getTransactionVolume(from, to);
    return transactions;
};

const getActiveWalletCount = async (workspaceId) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.countActiveWallets();
};

const getTotalTxCount = async (workspaceId, since) => {
    if (!workspaceId) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace)
        throw new Error('Could not find workspace');

    return workspace.getTransactionCount(since);
};

const getAddressLatestTokenBalances = async (workspaceId, address, tokenPatterns) => {
    if (!workspaceId|| !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    return await workspace.safeFindLatestTokenBalances(address, tokenPatterns);
};

const searchForAddress = async (workspaceId, address) => {
    if (!workspaceId || !address) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractByAddress(address);
    return contract ? [{
        type: 'contract',
        data: contract.toJSON()
    }] : [];
};

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

const searchForNumber = async (workspaceId, number) => {
    if (!workspaceId || !number) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const block = await workspace.findBlockByNumber(number, true);
    return block ? [{
        type: 'block',
        data: block.toJSON()
    }] : [];
};

const searchForText = async (workspaceId, text) => {
    if (!workspaceId || !text) throw new Error('Missing parameter.');

    const workspace = await Workspace.findByPk(workspaceId);
    const contracts = await workspace.findContractsByText(text);
    return contracts.map(c => ({
        type: 'contract',
        data: c.toJSON()
    }));
};

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

const getWorkspaceContractById = async (workspaceId, contractId) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const contract = await workspace.findContractById(contractId);
    return contract ? contract.toJSON() : null;
};

const getWorkspaceBlock = async (workspaceId, number) => {
    const workspace = await Workspace.findByPk(workspaceId, {
        include: {
            model: Explorer,
            as: 'explorer',
            include: {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: 'stripePlan'
            }
        }
    });

    const attributes = [
        'id', 'number', 'timestamp', 'baseFeePerGas', 'gasUsed', 'transactionsCount', 'gasLimit', 'hash', 'miner', 'extraData', 'difficulty', 'raw', 'parentHash',
        [
            Sequelize.literal(`(
                SELECT COUNT(*)::INTEGER
                FROM transactions
                WHERE transactions."blockId" = "Block".id
                AND transactions.state = 'ready'
            )`), 'syncedTransactionCount'
        ]
    ];

    if (workspace.explorer)
        if (await workspace.explorer.canUseCapability('l1Explorer'))
            attributes.push('l1BlockNumber');

    const block = await Block.findOne({
        where: { number, workspaceId },
        attributes
    });

    return block ? block.toJSON() : null;
};

const getWorkspaceBlocks = async (workspaceId, page = 1, itemsPerPage = 10, order = 'DESC') => {
    const workspace = await Workspace.findByPk(workspaceId);
    const blocks = await workspace.getFilteredBlocks(page, itemsPerPage, order);

    return {
        items: blocks.map(b => b.toJSON())
    };
};

const getWorkspaceTransaction = async (workspaceId, hash) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const transaction = await workspace.findTransaction(hash);

    return transaction ? transaction.toJSON() : null;
};

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

const getWorkspaceContracts = async (workspaceId, page, itemsPerPage, orderBy, order, pattern) => {
    const workspace = await Workspace.findByPk(workspaceId);
    const allowedPatterns = ['erc20', 'erc721'].indexOf(pattern) > -1 ? pattern : null;
    const contracts = await workspace.getFilteredContracts(page, itemsPerPage, orderBy, order, allowedPatterns);
    
    return { items: contracts.map(c => c.toJSON()) }
};

const getWorkspaceContract = async (workspaceId, address) => {
    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace)
        throw new Error('Could not find workspace');

    const contract = await workspace.findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getUserById = async (id) => {
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null;
};

const getUser = async (id, extraFields = []) => {
    const user = await User.findByAuthId(id, extraFields);
    return user ? user.toJSON() : null;
};

const createUser = async (uid, data) => {
    if (!uid || !data) throw new Error('Missing parameter.');

    const user = await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan, data.explorerSubscriptionId, data.passwordHash, data.passwordSalt, data.qnId);
    return user ? user.toJSON() : null;
};

const getUserWorkspaces = async (userId) => {
    const user = await User.findByAuthId(userId);
    return user.workspaces.map(w => w.toJSON());
};

const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].addIntegration(integration);
};

const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    await user.workspaces[0].removeIntegration(integration);
};

const createWorkspace = async (userId, data) => {
    if (!userId || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);
    const workspace = await user.safeCreateWorkspace(data);
    return workspace ? workspace.toJSON() : null;
};

const getWorkspaceByName = async (userId, workspaceName) => {
    const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
    if (!user)
        return null;
    return user.workspaces && user.workspaces.length ? user.workspaces[0].toJSON() : null;
};

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

const storeContractData = async (userId, workspace, address, data, transaction) => {
    if (!userId || !workspace || !address || !data) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data }, transaction);
    return contract ? contract.toJSON() : null;
};

const getContract = async (userId, workspaceId, address) => {
    if (!userId || !workspaceId || !address) throw new Error('Missing parameter.');

    const user = await User.findByPk(parseInt(userId));
    
    if (!user)
        return null;

    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

const getContractData = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');
    
    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contract = await user.workspaces[0].findContractByAddress(address);

    return contract ? contract.toJSON() : null;
};

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

const storeAccountPrivateKey = async (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, privateKey: privateKey });

    return account.toJSON();
};

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

const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const transaction = await user.workspaces[0].findTransaction(txHash);

    if (!transaction)
        throw new Error(`Couldn't find transaction`);

    return transaction.safeCreateTransactionTrace(trace);
};

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

const updateAccountBalance = async (userId, workspace, address, balance) => {
    if (!userId || !workspace || !address || !balance) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const account = await user.workspaces[0].safeCreateOrUpdateAccount({ address: address, balance: balance });

    return account.toJSON();
};

const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, name);
    await user.update({ currentWorkspaceId: user.workspaces[0].id });

    return user.toJSON();
};

const removeContract = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].removeContractByAddress(address);
};

const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const newWorkspace = await user.workspaces[0].updateSettings(settings);
    return newWorkspace.toJSON();
};

const resetWorkspace = async (userId, workspace, dayInterval) => {
    if (!userId || !String(workspace)) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, String(workspace));
    if (user && user.workspaces.length)
        await user.workspaces[0].reset(dayInterval);
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw new Error('Missing parameter.');

    const user = await User.findByStripeCustomerId(stripeCustomerId);
    return user ? user.toJSON() : null;
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    const contracts = await user.workspaces[0].getUnprocessedContracts();
    return contracts.map(c => c.toJSON());
};

const isUserPremium = async (userId) => {
    if (!userId) throw new Error('Missing parameter.');

    const user = await User.findByAuthId(userId);;
    return user.isPremium;
};

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

const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    return user.workspaces[0].findTransaction(transactionHash);
};

const getProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

const getFailedProcessableTransactions = async (uid, workspace) => {
    if (!uid || !workspace) throw new Error('Missing parameter.');

    const user = await User.findByAuthIdWithWorkspace(uid, workspace);
    const transactions = await user.workspaces[0].getFailedProcessableTransactions();
    return transactions.map(t => t.toJSON());
};

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw new Error('Missing parameter.');

   const explorer = await Explorer.findBySlug(slug);
   return explorer ? explorer.toJSON() : null;
};

const getPublicExplorerParamsByDomain = async (domain) => {
   if (!domain) throw new Error('Missing parameter.');

   const explorer = await Explorer.findByDomain(domain);
   return explorer ? explorer.toJSON() : null;
};

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

const updateContractVerificationStatus = async (userId, workspaceId, contractAddress, status) => {
    if (!userId || !workspaceId || !contractAddress || !status) throw new Error('Missing parameter.');

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return null;

    const user = await User.findByPk(userId);
    const workspaces = await user.getWorkspaces({ where: { id: workspaceId }});
    const contract = await workspaces[0].findContractByAddress(contractAddress);
    await contract.update({ verificationStatus: status });
    return contract.toJSON();
};

const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw new Error('Missing parameter.');

    if (['free', 'premium'].indexOf(plan) === -1)
        throw new Error('[updateUserPlan] Invalid plan');

    const user = await User.findByAuthId(userId);
    await user.update({ plan: plan });
    return user.toJSON();
};

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
    getFilteredNativeAccounts: getFilteredNativeAccounts
};
