const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const { enqueue } = require('../lib/queue');

router.get('/:address/:tokenId/transfers', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transfers = await db.getErc721TokenTransfers(data.workspace.id, req.params.address, req.params.tokenId);

        res.status(200).json(transfers);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/:tokenId/reload', workspaceAuthMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.workspace || !req.params.address || req.params.tokenId === undefined || req.params.tokenId === null) {
            console.log(data);
            throw '[POST /:address/:tokenId/reload] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(req.query.firebaseUserId, data.workspace);
        await enqueue('reloadErc721Token',
            `reloadErc721Token-${workspace.id}-${req.params.address}-${req.params.tokenId}`, {
                workspaceId: workspace.id,
                address: req.params.address,
                tokenId: req.params.tokenId
            }
        );

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

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

module.exports = router;
