const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const { enqueueTask } = require('../lib/tasks');

router.get('/:address/:index/transfers', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transfers = await db.getErc721TokenTransfers(data.workspace.id, req.params.address, req.params.index);

        res.status(200).json(transfers);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/:index/reload', workspaceAuthMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspace || !req.params.address || !req.params.index) {
            console.log(data);
            throw '[POST /tasks/fetchAndStoreErc721Token] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(data.firebaseUserId, data.workspace);

        await enqueueTask('reloadErc721', {
            workspaceId: workspace.id,
            address: req.params.address,
            index: req.params.index,
            secret: process.env.AUTH_SECRET
        }, `${process.env.CLOUD_RUN_ROOT}/tasks/reloadErc721`);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/:address/:index', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const token = await db.getContractErc721Token(data.workspace.id, req.params.address, req.params.index);

        res.status(200).json(token);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
