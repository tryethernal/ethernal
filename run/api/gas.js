const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { unmanagedError } = require('../lib/errors');

/*
    Return gas stats for the explorer
    
    @returns {object} - The gas stats
        - blockNumber: The block number it was calculated on
        - averageBlockSize: The average block size in transactions
        - averageUtilization: The average quantity of gas used per block
        - averageBlockTime: The average block time in seconds
        - latestBlockNumber: The number of the latest block used for this calculation
        - baseFeePerGas: The base fee per gas for the latest block
        - priorityFeePerGas: The three levels of priority fee per gas for the latest block (slow, average, fast)
*/
router.get('/stats', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getLatestGasStats(data.workspace.id, data.intervalInMinutes);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Return gas price history for the explorer

    @returns {array} - The gas price history
*/
router.get('/priceHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getGasPriceHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Return gas limit history for the explorer

    @returns {array} - The gas limit history
        - day: The day of the gas limit history
        - gasLimit: The average gas limit for the day
*/
router.get('/limitHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getGasLimitHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Return gas utilization ratio history for the explorer

    @returns {array} - The gas utilization ratio history
        - day: The day of the gas utilization ratio history
        - gasUtilizationRatio: The average gas utilization ratio for the day
*/
router.get('/utilizationRatioHistory', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getGasUtilizationRatioHistory(data.workspace.id, data.from, data.to);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Return the latest biggest gas consumers for the explorer:

    @returns {array} - The latest biggest gas consumers
        - to: The address of the gas consumer
        - gasUsed: The total gas used by the gas consumer
        - gasCost: Cost of total gas used
*/
router.get('/consumers', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getLatestGasConsumers(data.workspace.id, data.intervalInHours, data.limit);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    Return the latest biggest gas spenders for the explorer:

    @returns {array} - The latest biggest gas spenders
        - from: The address of the gas spender
        - gasUsed: The total gas used by the gas spender
        - gasCost: Cost of total gas used
        - percentUsed: The percentage of total gas used by the gas spender
*/
router.get('/spenders', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const result = await db.getLatestGasSpenders(data.workspace.id, data.intervalInHours, data.limit);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
