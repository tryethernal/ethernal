/**
 * @fileoverview Orbit Withdrawals API endpoints.
 * Manages L2→L1 withdrawals for Arbitrum Orbit chains.
 * @module api/orbitWithdrawals
 *
 * @route GET /:hash/claimCalldata - Get calldata to claim a withdrawal on L1
 * @route GET /:hash - Get withdrawals for a specific transaction
 * @route GET / - List all withdrawals (paginated)
 */

const express = require('express');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const { getClaimTransactionData } = require('../lib/orbitWithdrawals');
const { unmanagedError, managedError } = require('../lib/errors');

/**
 * Generate calldata that the user will have to send to claim an orbit withdrawal
 * This endpoint also returns the contract address, the chain id and the rpc server to use
 * The frontend only has to instantiate a viem instance and generate a raw transaction request
 * @param {string} hash - The hash of the transaction
 * @param {number} messageNumber - The message number of the withdrawal
 * @returns {Promise<Object>} - The claim calldata, the to address, the l1 rpc server, and the l1 chain id
 */
router.get('/:hash/claimCalldata', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };
    try {
        const { hash, messageNumber } = data;
        if (!hash || !messageNumber)
            return managedError(new Error('Missing parameters'), req, res);

        const { log, transaction } = await db.getL2TransactionForOrbitWithdrawalClaim(data.workspace.id, hash, messageNumber);
        const latestConfirmedBlock = await transaction.workspace.getOrbitLatestConfirmedBlock();

        const callData = await getClaimTransactionData(messageNumber, latestConfirmedBlock.sendCount, transaction, log);

        res.status(200).json({
            callData,
            to: transaction.workspace.orbitConfig.outboxContract,
            l1RpcServer: transaction.workspace.orbitConfig.parentChainRpcServer,
            l1ChainId: transaction.workspace.orbitConfig.parentChainId
        });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get an orbit withdrawal for a workspace
 * @param {string} hash - The hash of the transaction
 * @returns {Promise<Object>} - The orbit withdrawal l2 transaction
 */
router.get('/:hash', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };
    try {
        const { hash } = data;

        const { rows: items, count: total } = await db.getL2TransactionOrbitWithdrawals(data.workspace.id, hash);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

/**
 * Get paginated list of orbit withdrawals for a workspace
 * @param {number} page - The page number
 * @param {number} itemsPerPage - The number of items per page
 * @param {string} order - The order to sort by
 * @returns {Promise<Array>} - A list of orbit withdrawals
 */
router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const { page, itemsPerPage, order } = data;

        const { rows: items, count: total } = await db.getWorkspaceOrbitWithdrawals(data.workspace.id, page, itemsPerPage, order);

        res.status(200).json({ items, total });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
