const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const { ERC721Connector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/:address/totalSupply', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);
        const totalSupply = await erc721Connector.totalSupply();

        res.status(200).json({ totalSupply });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.collections.address.totalSupply', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/:address/tokens', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        const result = await db.getContractErc721Tokens(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.collections.address.tokens', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
