const express = require('express');
const authMiddleware = require('../middlewares/auth');
const secretMiddleware = require('../middlewares/secret');
const { sanitize, stringifyBns, withTimeout } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { ProviderConnector } = require('../lib/rpc');
const PM2 = require('../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../lib/env');
const router = express.Router();
const { managedError, unmanagedError } = require('../lib/errors');

router.post('/reprocessTransactionErrors', [secretMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId)
            return managedError(new Error('Missing parameters.'), req, res);

        await enqueue('reprocessWorkspaceTransactionErrors', `reprocessWorkspaceTransactionErrors-${data.workspaceId}`, { workspaceId: data.workspaceId });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/reprocessTransactionTraces', [secretMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId)
            return managedError(new Error('Missing parameters.'), req, res);

        await enqueue('reprocessWorkspaceTransactionTraces', `reprocessWorkspaceTransactionTraces-${data.workspaceId}`, { workspaceId: data.workspaceId });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id', [authMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.deleteWorkspace(data.user.id, req.params.id);
        res.sendStatus(200);
    } catch(error) {
        if (error.message.startsWith('Please reset'))
            return managedError(error, req, res);
        unmanagedError(error, req, next);
    }
});

router.get('/', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        const workspaces = await db.getUserWorkspaces(data.uid);

        res.status(200).json(workspaces);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id', secretMiddleware, async (req, res, next) => {
    try {
        const workspace = await db.getWorkspaceById(req.params.id);

        res.status(200).json(workspace);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspaceData || !data.name)
            return managedError(new Error('Missing parameters.'), req, res);

        const user = await db.getUser(data.uid, ['defaultDataRetentionLimit']);
        if (!user)
            return managedError(new Error('Could not find user.'), req, res);

        let networkId;
        if (data.workspaceData.public) {
            const provider = new ProviderConnector(data.workspaceData.rpcServer);
            try {
                networkId = await withTimeout(provider.fetchNetworkId());
            } catch(error) {
                return managedError(new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`), req, res);
            }
            if (!networkId)
                return managedError(new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`), req, res);
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
            dataRetentionLimit: user.defaultDataRetentionLimit,
            erc721LoadingEnabled: false
        }));

        const workspace = await db.createWorkspace(data.uid, filteredWorkspaceData);

        if (!workspace)
            return managedError(new Error(`Couldn't create workspace`), req, res);

        if (!user.currentWorkspace)
            await db.setCurrentWorkspace(user.firebaseUserId, filteredWorkspaceData.name);

        res.status(200).json(workspace);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/settings', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace || !data.settings)
            return managedError(new Error('Missing parameter.'), req, res);

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
        if (workspace.public && data.settings.rpcServer != workspace.rpcServer) {
            const provider = new ProviderConnector(data.settings.rpcServer);
            try {
                const networkId = await withTimeout(provider.fetchNetworkId());
                data.settings.networkId = networkId;
            } catch(error) {
                return managedError(new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`), req, res);
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

        try {
            await db.updateWorkspaceSettings(data.uid, data.workspace, data.settings);
        } catch(error) {
            return managedError(new Error(error), req, res);
        }

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/setCurrent', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace)
            return managedError(new Error('Missing parameter.'), req, res);

        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

/*
    This endpoint is used to reset a workspace.
    If the workspace doesn't have to much data, it will be reset synchronously.
    Otherwise, it will be marked for deletion, and a new empty workspace will be created in its place.
    The old workspace will be deleted in the background.
*/
router.post('/reset', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace)
            return managedError(new Error('Missing parameter.'), req, res);

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        if (!workspace)
            return managedError(new Error('Could not find workspace.'), req, res);

        const needsBatchReset = await db.workspaceNeedsBatchReset(data.uid, workspace.id);
        if (needsBatchReset) {
            await db.markWorkspaceForDeletion(data.user.id, workspace.id);
            await db.replaceWorkspace(data.user.id, workspace.id);
            await enqueue('workspaceReset', `workspaceReset-${workspace.id}`, {
                workspaceId: workspace.id,
                from: new Date(0),
                to: new Date()
            });
            await enqueue('deleteWorkspace', `deleteWorkspace-${workspace.id}`, { workspaceId: workspace.id });
        }
        else
            await db.resetWorkspace(data.uid, data.workspace);

        res.status(200).json({ needsBatchReset });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
