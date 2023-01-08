const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/:address/holderHistory', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        if (!data.workspace.public)
            throw new Error('This endpoint is not available on private workspaces.');

        const volume = await db.getErc20TokenHolderHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.erc20Contracts.address.holderHistory', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:address/cumulativeSupply', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        if (!data.workspace.public)
            throw new Error('This endpoint is not available on private workspaces.');

        const volume = await db.getErc20ContractCumulativeSupply(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.erc20Contracts.address.cumulativeSupply', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:address/transferVolume', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        if (!data.workspace.public)
            throw new Error('This endpoint is not available on private workspaces.');

        const volume = await db.getErc20ContractTransferVolume(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.erc20Contracts.address.transferVolume', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/:address/holders', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            throw new Error('Missing parameter');

        const result = await db.getErc20ContractHolders(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.erc20Contracts.address.holders', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/:address/transfers', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            throw new Error('Missing parameter');

        const result = await db.getErc20ContractTransfers(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.erc20Contracts.address.transfers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
