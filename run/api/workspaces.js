const express = require('express');
const authMiddleware = require('../middlewares/auth');
const { sanitize, stringifyBns } = require('../lib/utils');
const { encode, decrypt, decode } = require('../lib/crypto');
const { enqueueTask } = require('../lib/tasks');
const db = require('../lib/firebase');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const workspaces = await db.getUserWorkspaces(data.uid);

        res.status(200).json(workspaces);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/disableApi', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces/disableApi] Missing parameters');
        }

        await db.removeIntegration(data.uid, data.workspace, 'api');

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/disableAlchemy', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces/disableAlchemy] Missing parameters');
        }

        await db.removeIntegration(data.uid, data.workspace, 'alchemy');

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/enableApi', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces/enableApi] Missing parameters');
        }

        await db.addIntegration(data.uid, data.workspace, 'api');

        const user = await db.getUser(data.uid);
        const apiKey = decrypt(user.apiKey);

        const token = encode({
            uid: data.uid,
            workspace: data.workspace,
            apiKey: apiKey
        });

        res.status(200).json({ token: token });
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/enableAlchemy', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces/enableAlchemy] Missing parameters');
        }

        await db.addIntegration(data.uid, data.workspace, 'alchemy');

        const user = await db.getUser(data.uid);
        const apiKey = decrypt(user.apiKey);

        const token = encode({
            uid: data.uid,
            workspace: data.workspace,
            apiKey: apiKey
        });

        res.status(200).json({ token: token });
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspaceData || !data.name) {
            console.log(data);
            throw new Error('[POST /api/workspaces] Missing parameter');
        }

        const user = await db.getUser(data.uid, ['defaultDataRetentionLimit']);

        const filteredWorkspaceData = stringifyBns(sanitize({
            name: data.name,
            chain: data.workspaceData.chain,
            networkId: data.workspaceData.networkId,
            rpcServer: data.workspaceData.rpcServer,
            settings: data.workspaceData.settings,
            public: data.workspaceData.public,
            dataRetentionLimit: user.defaultDataRetentionLimit
        }));

        const workspace = await db.createWorkspace(data.uid, filteredWorkspaceData);

        await enqueueTask('processWorkspace', {
            uid: data.uid,
            workspace: filteredWorkspaceData.name,
            secret: process.env.AUTH_SECRET
        });

        res.status(200).json(workspace);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.post('/settings', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.settings) {
            console.log(data);
            throw new Error('[POST /api/workspaces/settings] Missing parameter');
        }

        await db.updateWorkspaceSettings(data.uid, data.workspace, data.settings);

        await enqueueTask('processWorkspace', {
            uid: data.uid,
            workspace: data.workspace,
            secret: process.env.AUTH_SECRET
        });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/setCurrent', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces] Missing parameter');
        }

        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/reset', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error('[POST /api/workspaces/reset] Missing parameter');
        }

        await db.resetWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
