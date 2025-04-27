const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

/**
 * Retrieves the top tokens by holders for a workspace
 * @param {string} workspaceId - The workspace id
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string[]} patterns - Token patterns to filter by (erc20, erc721, erc1155)
 * @returns {Array<Object>} - A list of top tokens by holders
 */
router.get('/topTokensByHolders', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        // Convert patterns string to array if it exists, default to ['erc20']
        const patterns = data.patterns ? 
            (Array.isArray(data.patterns) ? data.patterns : data.patterns.split(',')) : 
            ['erc20'];

        const topTokens = await db.getTopTokensByHolders(data.workspace.id, data.page, data.itemsPerPage, patterns);

        res.status(200).json({ items: topTokens });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Retrieves contract stats for a workspace
 * - totalContracts
 * - contractsLast24Hours
 * - verifiedContracts
 * - verifiedContractsLast24Hours
 * @param {string} workspaceId - The workspace id
 * @returns {Object} - An object containing the contract stats
 */
router.get('/contracts', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const contractStats = await db.getWorkspaceContractStats(data.workspace.id);

        res.status(200).json({ stats: contractStats });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the burnt fees for the last 24 hours for a workspace.

    @param {string} workspaceId - The ID of the workspace
    @returns {number} - The burnt fees for the last 24 hours
*/
router.get('/last24hBurntFees', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const burntFees = await db.getLast24hBurntFees(data.workspace.id);

        res.status(200).json({ burntFees });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the total gas used for the last 24 hours for a workspace.

    @param {string} workspaceId - The ID of the workspace
    @returns {number} - The total gas used for the last 24 hours
*/
router.get('/last24hTotalGasUsed', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const totalGasUsed = await db.getLast24hTotalGasUsed(data.workspace.id);

        res.status(200).json({ totalGasUsed });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the gas utilization ratio for the last 24 hours for a workspace.

    @param {string} workspaceId - The ID of the workspace
    @returns {number} - The gas utilization ratio for the last 24 hours
*/
router.get('/gasUtilisationRatio24h', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const gasUtilisationRatio24h = await db.getLast24hGasUtilisationRatio(data.workspace.id);

        res.status(200).json({ gasUtilisationRatio24h });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the average transaction fee for the last 24 hours for a workspace.

    @param {string} workspaceId - The ID of the workspace
    @returns {number} - The average transaction fee for the last 24 hours
*/
router.get('/averageTransactionFee24h', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const avgTransactionFee24h = await db.getLast24hAverageTransactionFee(data.workspace.id);

        res.status(200).json({ avgTransactionFee24h });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the total of transaction fees for the last 24 hours for a workspace.

    @param {string} workspaceId - The ID of the workspace
    @returns {number} - The average transaction fee for the last 24 hours
*/
router.get('/transactionFee24h', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const transactionFee24h = await db.getLast24hTransactionFees(data.workspace.id);

        res.status(200).json({ transactionFee24h });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the daily average transaction fees for a workspace.

    @param {string} from - Start day
    @param {string} to - End day
    @returns {array} - The transaction fees
        - day: The day of the transaction fees
        - transactionFees: The average transaction fees for the day
*/
router.get('/transactionFeeHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const transactionFeeHistory = await db.getTransactionFeeHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(transactionFeeHistory);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the block size history for a workspace.

    @param {string} from - The start date of the block size history
    @param {string} to - The end date of the block size history
    @returns {array} - The block size history
        - day: The day of the block size history
        - size: The average block size for the day
*/
router.get('/blockSizeHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const blockSizeHistory = await db.getBlockSizeHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(blockSizeHistory);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to get the block time history for a workspace.

    @param {string} from - The start date of the block time history
    @param {string} to - The end date of the block time history
    @returns {array} - The block time history
        - day: The day of the block time history
        - blockTime: The average block time for the day
*/
router.get('/blockTimeHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const blockTimeHistory = await db.getBlockTimeHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(blockTimeHistory);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const transactions = await db.getTransactionVolume(data.workspace.id, data.from, data.to);

        res.status(200).json(transactions);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/tokenTransferVolume', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const transfers = await db.getTokenTransferVolume(data.workspace.id, data.from, data.to, data.address, data.type);

        res.status(200).json(transfers);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/uniqueWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const uniqueWalletCount = await db.getUniqueWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(uniqueWalletCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/cumulativeWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const cumulativeWalletCount = await db.getCumulativeWalletCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeWalletCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/deployedContractCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const deployedContractCount = await db.getDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(deployedContractCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/cumulativeDeployedContractCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const cumulativeDeployedContractCount = await db.getCumulativeDeployedContractCount(data.workspace.id, data.from, data.to);

        res.status(200).json(cumulativeDeployedContractCount);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/averageGasPrice', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const avgGasPrice = await db.getAverageGasPrice(data.workspace.id, data.from, data.to);

        res.status(200).json(avgGasPrice);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/averageTransactionFee', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const avgTransactionFee = await db.getAverageTransactionFee(data.workspace.id, data.from, data.to);

        res.status(200).json(avgTransactionFee);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/txCount24h', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const ts24hago = new Date(new Date().getTime() - (24 * 3600 *1000));
        const count = await db.getTotalTxCount(data.workspace.id, ts24hago);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/txCountTotal', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const count = await db.getTotalTxCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/activeWalletCount', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace)
            return managedError(new Error('Missing parameters.'), req, res);

        const count = await db.getActiveWalletCount(data.workspace.id);

        res.status(200).json({ count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
