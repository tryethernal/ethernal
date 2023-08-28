const express = require('express');
const { stringifyBns, sanitize } = require('../lib/utils');
const { getAppDomain } = require('../lib/env');
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const browserSyncMiddleware = require('../middlewares/browserSync');
const logger = require('../lib/logger');
const { enqueue } = require('../lib/queue');

const router = express.Router();

router.get('/:number/transactions', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!req.params.number)
            throw new Error('Missing parameter.');

        const { transactions: items, count: total } = await db.getBlockTransactions(data.workspace.id, req.params.number, data.page, data.itemsPerPage, data.order, data.orderBy);

        res.status(200).json({ items, total });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.blocks.number', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/syncRange', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspace || data.from === undefined || data.from === null || data.to === undefined || data.to === null)
            throw new Error('Missing parameter');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
        if (!workspace.public)
            throw new Error(`You are not allowed to use server side sync. If you'd like to, please reach out at contact@tryethernal.com`);

        await enqueue('batchBlockSync', `batchBlockSync-${data.uid}-${data.workspace}-${data.from}-${data.to}`, {
            userId: data.uid,
            workspace: data.workspace,
            from: data.from,
            to: data.to,
        });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.blocks.syncRange', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const blocks = await db.getWorkspaceBlocks(data.workspace.id, data.page, data.itemsPerPage, data.order, data.withCount);

        res.status(200).json(blocks);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.blocks', error: error, data: data });
        res.status(400).send(error.messagae);
    }
});

router.get('/:number', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!req.params.number)
            throw new Error('Missing parameter.');

        const block = await db.getWorkspaceBlock(data.workspace.id, req.params.number, !!data.withTransactions);

        res.status(200).json(block);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.blocks.number', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/', [authMiddleware, browserSyncMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        const block = data.block;

        if (!block)
            throw Error('Missing block parameter.');

        const serverSync = req.query.serverSync && String(req.query.serverSync) === 'true';

        if (serverSync) {
            const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
            /*
                All current explorers need to be migrated before using this. 
            */
            // const hasActiveExplorer = workspace.explorer && workspace.explorer.stripeSubscription;
            if (!workspace.public)
                throw new Error(`You need to have an active explorer to use server side sync. Go to https://app.${getAppDomain()}/explorers for more info`);

            if (block.number === undefined || block.number === null)
                throw Error('Missing block number.');

            await enqueue(`blockSync`, `blockSync-${workspace.id}-${block.number}`, {
                userId: data.uid,
                workspace: data.workspace,
                blockNumber: data.block.number,
                source: 'api'
            }, 1);
        }
        else {
            const canUserSyncBlock = await db.canUserSyncBlock(data.user.id);
            if (!canUserSyncBlock)
                throw new Error(`You are on a free plan with more than one workspace. Please upgrade your plan, or delete your extra workspaces here: https://app.${getAppDomain()}/settings.`);

            const syncedBlock = stringifyBns(sanitize(block));
            await db.storeBlock(data.uid, data.workspace, syncedBlock);
        }

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.blocks', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
