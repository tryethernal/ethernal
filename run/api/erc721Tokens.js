const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../lib/firebase');
const { sanitize, formatErc721Metadata } = require('../lib/utils');
const { ERC721Connector } = require('../lib/rpc');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { enqueue } = require('../lib/queue');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/:address/:tokenId/transfers', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const transfers = await db.getErc721TokenTransfers(data.workspace.id, req.params.address, req.params.tokenId);

        res.status(200).json(transfers);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:address/:tokenId/reload', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        if (!data.workspace || !req.params.address || req.params.tokenId === undefined || req.params.tokenId === null)
            return managedError(new Error('Missing parameter.'), req, res);

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
        unmanagedError(error, req, next);
    }
});

router.get('/:address/tokenIndex/:tokenIndex', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);

        let metadata, URI, owner;

        const tokenId = await erc721Connector.tokenByIndex(req.params.tokenIndex);

        if (!tokenId)
            return res.status(200).send(null);

        try {
            owner = await erc721Connector.ownerOf(tokenId);
        } catch(_) {
            owner = null;
        }

        if (!owner)
            return res.status(200).send(null);

        try {
            URI = await erc721Connector.tokenURI(tokenId);
        } catch(_) {
            URI = null;
        }

        if (URI) {
            const axiosableURI = URI.startsWith('ipfs://') ?
                `https://gateway.pinata.cloud/ipfs/${URI.slice(7, URI.length)}` : URI;
            try {
                const response = await axios.get(axiosableURI);
                metadata = response.data;
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
            attributes: formatErc721Metadata(req.params.tokenIndex, metadata),
            metadata
        });

        res.status(200).json(token);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:address/:tokenId', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const erc721Connector = new ERC721Connector(data.workspace.rpcServer, req.params.address);

        let metadata, URI, owner;

        try {
            owner = await erc721Connector.ownerOf(req.params.tokenId);
        } catch(_) {
            owner = null;
        }

        if (!owner)
            return res.status(200).send(null);

        try {
            URI = await erc721Connector.tokenURI(req.params.tokenId);
        } catch(_) {
            URI = null;
        }

        if (URI) {
            const axiosableURI = URI.startsWith('ipfs://') ?
            `https://gateway.pinata.cloud/ipfs/${URI.slice(7, URI.length)}` : URI;
            try {
                const response = await axios.get(axiosableURI);
                metadata = response.data;
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
            attributes: formatErc721Metadata(req.params.tokenId, metadata),
            metadata
        });

        res.status(200).json(token);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
