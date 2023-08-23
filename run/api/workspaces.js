const express = require('express');
const logger = require('../lib/logger');
const authMiddleware = require('../middlewares/auth');
const secretMiddleware = require('../middlewares/secret');
const { sanitize, stringifyBns } = require('../lib/utils');
const { encode, decrypt } = require('../lib/crypto');
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { ProviderConnector } = require('../lib/rpc');
const router = express.Router();

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
                networkId = await provider.fetchNetworkId();
            } catch(error) {
                networkId = null;
            }
            if (!networkId)
                throw new Error(`Can't reach RPC server, make sure it's accessible.`);
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

        await db.resetWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.workspaces.reset', error: error, data: data });
        res.status(400).send(error);
    }
});

module.exports = router;
