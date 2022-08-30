const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/:address/tokens', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        const result = await db.getContractErc721Tokens(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
