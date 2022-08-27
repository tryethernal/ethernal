const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { enqueueTask } = require('../lib/tasks');

router.get('/:address/:tokenId', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const token = await db.getContractErc721Token(data.workspace.id, req.params.address, req.params.tokenId);

        res.status(200).json(token);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/:tokenId/reload', workspaceAuthMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspace || !req.params.address || !req.params.tokenId) {
            console.log(data);
            throw '[POST /tasks/fetchAndStoreErc721Token] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(data.firebaseUserId, data.workspace);

        await enqueueTask('reloadErc721Metadata', {
            workspaceId: workspace.id,
            address: req.params.address,
            tokenId: req.params.tokenId,
            secret: process.env.AUTH_SECRET
        }, `${process.env.CLOUD_RUN_ROOT}/tasks/reloadErc721Metadata`);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
