const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { ERC721Connector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { unmanagedError } = require('../lib/errors');

router.get('/:address/totalSupply', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);
        let totalSupply = await erc721Connector.totalSupply();
        if (!totalSupply)
            totalSupply = '0';

        res.status(200).json({ totalSupply });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/tokens', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;
    try {
        const result = await db.getContractErc721Tokens(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
