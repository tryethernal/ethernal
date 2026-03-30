/**
 * @fileoverview Block API endpoints.
 * Provides routes for retrieving blocks, syncing block ranges, and getting block transactions.
 * @module api/blocks
 *
 * @route GET /:number/transactions - Get transactions for a block
 * @route POST /syncRange - Sync a range of blocks
 * @route GET /:number - Get block by number
 * @route GET / - List blocks with pagination
 */

const express = require('express');
const { stringifyBns, sanitize } = require('../lib/utils');
const { getAppDomain } = require('../lib/env');
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const browserSyncMiddleware = require('../middlewares/browserSync');
const { enqueue } = require('../lib/queue');
const { managedError, unmanagedError } = require('../lib/errors');

const router = express.Router();

router.get('/:number/transactions', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        if (!data.number)
            return managedError(new Error('Missing parameter.'), req, res);

        const param = String(data.number).trim();
        if (param === 'undefined' || param === 'null' || param === '')
            return managedError(new Error('Invalid block number parameter.'), req, res);

        const { rows: items, count: total } = await db.getBlockTransactions(data.workspace.id, param, data.page, data.itemsPerPage, data.order, data.orderBy, data.withCount);

        res.status(200).json({ items, total });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/syncRange', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.workspace || data.from === undefined || data.from === null || data.to === undefined || data.to === null)
            return managedError(new Error('Missing parameter'), req, res);

        const workspace = await db.getWorkspaceByNameAuth(data.uid, data.workspace);
        if (!workspace.public)
            return managedError(new Error(`You are not allowed to use server side sync. If you'd like to, please reach out at contact@tryethernal.com`), req, res);

        await enqueue('batchBlockSync', `batchBlockSync-${data.uid}-${data.workspace}-${data.from}-${data.to}`, {
            userId: data.uid,
            workspace: data.workspace,
            workspaceId: workspace.id,
            from: data.from,
            to: data.to,
        });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        const blocks = await db.getWorkspaceBlocks(data.workspace.id, data.page, data.itemsPerPage, data.order);

        res.status(200).json(blocks);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:number', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        if (!req.params.number)
            return managedError(new Error('Missing parameter.'), req, res);

        const param = String(req.params.number).trim();
        if (param === 'undefined' || param === 'null' || param === '')
            return managedError(new Error('Invalid block number parameter.'), req, res);

        const block = await db.getWorkspaceBlock(data.workspace.id, param);

        res.status(200).json(block);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/', [authMiddleware, browserSyncMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        const block = data.block;

        if (!block)
            return managedError(new Error('Missing block parameter.'), req, res);

        const serverSync = req.query.serverSync && String(req.query.serverSync) === 'true';

        if (serverSync) {
            const workspace = await db.getWorkspaceByNameLight(data.uid, data.workspace);
            /*
                All current explorers need to be migrated before using this. 
            */
            // const hasActiveExplorer = workspace.explorer && workspace.explorer.stripeSubscription;
            if (!workspace.public)
                return managedError(new Error(`You need to have an active explorer to use server side sync. Go to https://app.${getAppDomain()}/explorers for more info`), req, res);

            if (block.number === undefined || block.number === null)
                return managedError(new Error('Missing block number.'), req, res);

            await enqueue(`blockSync`, `blockSync-${workspace.id}-${block.number}`, {
                workspaceId: workspace.id,
                blockNumber: data.block.number,
                source: 'api'
            }, 1);
        }
        else {
            const canUserSyncBlock = await db.canUserSyncBlock(data.user.id);
            if (!canUserSyncBlock)
                return managedError(new Error(`You are on a free plan with more than one workspace. Please upgrade your plan, or delete your extra workspaces here: https://app.${getAppDomain()}/settings.`), req, res);

            const syncedBlock = stringifyBns(sanitize(block));
            await db.storeBlock(data.uid, data.workspace, syncedBlock);
        }

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
