const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const { sanitize, formatErc721Metadata } = require('../lib/utils');
const { ERC721Connector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { enqueue } = require('../lib/queue');

router.get('/:address/:tokenId/transfers', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const transfers = await db.getErc721TokenTransfers(data.workspace.id, req.params.address, req.params.tokenId);

        res.status(200).json(transfers);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.tokens.address.tokenId.transfers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:address/:tokenId/reload', workspaceAuthMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.workspace || !req.params.address || req.params.tokenId === undefined || req.params.tokenId === null)
            throw new Error('Missing parameter.');

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
        logger.error(error.message, { location: 'post.api.tokens.address.tokenId.reload', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.messagae);
    }
});

router.get('/:address/tokenIndex/:tokenIndex', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);

        let metadata, URI;

        const tokenId = await erc721Connector.tokenByIndex(req.params.tokenIndex);

        if (!tokenId)
            return res.sendStatus(200);

        const owner = await erc721Connector.ownerOf(tokenId);

        try {
            URI = await erc721Connector.tokenURI(tokenId);
        } catch(_) {
            URI = null;
        }

        if (URI) {
            const axiosableURI = URI.startsWith('ipfs://') ?
                `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;
            try {
                metadata = (await axios.get(axiosableURI)).data;
            } catch(error) {
                metadata = {};
            }
        }
        else
            metadata = {};

        const token = sanitize({
            tokenId: tokenId,
            owner: owner,
            URI: URI,
            attributes: formatErc721Metadata(metadata),
            metadata
        });

        res.status(200).json(token);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.tokens.address.tokenIndex', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/:address/:tokenId', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);

        let metadata, URI;

        const owner = await erc721Connector.ownerOf(req.params.tokenId);

        try {
            URI = await erc721Connector.tokenURI(req.params.tokenId);
        } catch(_) {
            URI = null;
        }

        if (URI) {
            const axiosableURI = URI.startsWith('ipfs://') ?
                `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;
            try {
                metadata = (await axios.get(axiosableURI)).data;
            } catch(error) {
                metadata = {};
            }
        }
        else
            metadata = {};

        const token = sanitize({
            tokenId: req.params.tokenId,
            owner: owner,
            URI: URI,
            attributes: formatErc721Metadata(metadata),
            metadata
        });

        res.status(200).json(token);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.tokens.address.tokenId', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
