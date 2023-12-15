const express = require('express');
const logger = require('../lib/logger');
const authMiddleware = require('../middlewares/auth');
const secretMiddleware = require('../middlewares/secret');
const { sanitize, stringifyBns, withTimeout } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { ProviderConnector } = require('../lib/rpc');
const PM2 = require('../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const router = express.Router();

router.post('/reprocessTransactionErrors', [secretMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId)
            throw new Error('Missing parameters.');

        await enqueue('reprocessWorkspaceTransactionErrors', `reprocessWorkspaceTransactionErrors-${data.workspaceId}`, { workspaceId: data.workspaceId });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.reprocessWorkspaceTransactionErrors', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/reprocessTransactionTraces', [secretMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId)
            throw new Error('Missing parameters.');

        await enqueue('reprocessWorkspaceTransactionTraces', `reprocessWorkspaceTransactionTraces-${data.workspaceId}`, { workspaceId: data.workspaceId });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.reprocessTransactions', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.delete('/:id', [authMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        await db.deleteWorkspace(data.user.id, req.params.id);
        res.sendStatus(200);
    } catch(error) { 
        logger.error(error.message, { location: 'delete.api.workspaces', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        const workspaces = await db.getUserWorkspaces(data.uid);

        res.status(200).json(workspaces);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.workspaces', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:id', secretMiddleware, async (req, res) => {
    try {
        const workspace = await db.getWorkspaceById(req.params.id);

        res.status(200).json(workspace);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.workspaces.id', error: error, data: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspaceData || !data.name)
            throw new Error('Missing parameters.');

        const user = await db.getUser(data.uid, ['defaultDataRetentionLimit']);
        if (!user)
            throw new Error('Could not find user.');

        let networkId;
        if (data.workspaceData.public) {
            const provider = new ProviderConnector(data.workspaceData.rpcServer);
            try {
                networkId = await withTimeout(provider.fetchNetworkId());
            } catch(error) {
                networkId = null;
            }
            if (!networkId)
                throw new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
        }
        else {
            networkId = data.workspaceData.networkId
        }

        const filteredWorkspaceData = stringifyBns(sanitize({
            name: data.name,
            chain: data.workspaceData.chain,
            networkId: networkId,
            rpcServer: data.workspaceData.rpcServer,
            settings: data.workspaceData.settings,
            public: data.workspaceData.public,
            tracing: data.workspaceData.tracing,
            dataRetentionLimit: user.defaultDataRetentionLimit
        }));

        const workspace = await db.createWorkspace(data.uid, filteredWorkspaceData);

        if (!workspace)
            throw new Error(`Couldn't create workspace`);

        if (!user.currentWorkspace)
            await db.setCurrentWorkspace(user.firebaseUserId, filteredWorkspaceData.name);

        res.status(200).json(workspace);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/settings', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !data.settings)
            throw new Error('Missing parameter.');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
        if (workspace.public && data.settings.rpcServer != workspace.rpcServer) {
            const provider = new ProviderConnector(data.settings.rpcServer);
            try {
                const networkId = await withTimeout(provider.fetchNetworkId());
                data.settings.networkId = networkId;
            } catch(error) {
                throw new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
            }
            if (workspace.explorer && workspace.explorer.shouldSync) {
                const pm2 = new PM2(getPm2Host(), getPm2Secret());
                const { data: pm2Process } = await pm2.find(workspace.explorer.slug);
                if (pm2Process)
                    await pm2.restart(workspace.explorer.slug);
                else
                    await pm2.start(workspace.explorer.slug, workspace.id);
            }
        }

        await db.updateWorkspaceSettings(data.uid, data.workspace, data.settings);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.settings', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/setCurrent', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace)
            throw new Error('Missing parameter.');

        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.setCurrent', error: error, data: data });
        res.status(400).send(error);
    }
});

router.post('/reset', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace)
            throw new Error('Missing parameter.');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        const needsBatchReset = await db.workspaceNeedsBatchReset(data.uid, workspace.id);
        if (needsBatchReset)
            await db.batchResetWorkspace(data.uid, workspace.id, new Date(0), new Date());
        else
            await db.resetWorkspace(data.uid, data.workspace);

        res.status(200).json({ needsBatchReset });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.reset', error: error, data: data });
        res.status(400).send(error);
    }
});

module.exports = router;
