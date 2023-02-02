const logger = require('../../lib/logger');
const db = require('../../lib/firebase');

const holderHistory = async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const history = await db.getTokenHolderHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(history);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.modules.tokens.holderHistory', error: error, data: data });
        res.status(400).send(error.message);
    }
};

const cumulativeSupply = async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const volume = await db.getTokenCumulativeSupply(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.modules.tokens.cumulativeSupply', error: error, data: data });
        res.status(400).send(error.message);
    }
};

const transferVolume = async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            throw new Error('Missing parameters.');

        const volume = await db.getTokenTransferVolume(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.modules.tokens.transferVolume', error: error, data: data });
        res.status(400).send(error.message);
    }
};

const holders = async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            throw new Error('Missing parameter');

        const result = await db.getTokenHolders(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.modules.tokens.holders', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
};

const transfers = async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            throw new Error('Missing parameter');

        const result = await db.getTokenTransfers(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.modules.tokens.transfers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
};

module.exports = {
    holderHistory: holderHistory,
    cumulativeSupply: cumulativeSupply,
    transferVolume: transferVolume,
    holders: holders,
    transfers: transfers
};
