const db = require('../../lib/firebase');
const { managedError, unmanagedError } = require('../../lib/errors');

const holderHistory = async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const history = await db.getTokenHolderHistory(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(history);
    } catch(error) {
        unmanagedError(error, req, next);
    }
};

const circulatingSupply = async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !data.from || !data.to)
            return managedError(new Error('Missing parameters.'), req, res);

        const volume = await db.getTokenCirculatingSupply(data.workspace.id, req.params.address, data.from, data.to);

        res.status(200).json(volume);
    } catch(error) {
        unmanagedError(error, req, next);
    }
};

const holders = async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getTokenHolders(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
};

const transfers = async (req, res, next) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getTokenTransfers(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.orderBy, data.order, data.fromBlock);

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
};

module.exports = { holderHistory, circulatingSupply, holders, transfers };