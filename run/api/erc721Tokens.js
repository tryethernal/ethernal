const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

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
