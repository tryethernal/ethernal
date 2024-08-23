const express = require('express');
const moment = require('moment');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const Lock = require('../lib/lock');
const { validateBNString } = require('../lib/utils')
const { ProviderConnector, WalletConnector } = require('../lib/rpc');
const authMiddleware = require('../middlewares/auth');
const workspaceAuth = require('../middlewares/workspaceAuth');

router.get('/:id/transactionHistory', workspaceAuth, async (req, res) => {
    const data = req.query;

    try {
        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            throw new Error('Could not find faucet');

        const { rows: transactions, count } = await db.getFaucetTransactionHistory(faucet.id, data.page, data.itemsPerPage, data.order, data.orderBy);

        res.status(200).json({ transactions, count });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id.transactionHistory', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/tokenVolume', workspaceAuth, async (req, res) => {
    const data = req.query;

    try {
        if (!data.from || !data.to)
            throw new Error('Missing parameter');

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            throw new Error('Could not find faucet');

        const tokens = await db.getFaucetTokenVolume(faucet.id, data.from, data.to);

        res.status(200).json(tokens);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id.tokenVolume', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/requestVolume', workspaceAuth, async (req, res) => {
    const data = req.query;

    try {
        if (!data.from || !data.to)
            throw new Error('Missing parameter');

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            throw new Error('Could not find faucet');

        const requests = await db.getFaucetRequestVolume(faucet.id, data.from, data.to);

        res.status(200).json(requests);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id.requestVolume', error });
        res.status(400).send(error.message);
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.deleteFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'delete.api.faucets.id', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/privateKey', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        const isAllowed = await db.ownFaucet(data.uid, req.params.id);
        if (!isAllowed)
            throw new Error('Could not find faucet');
        const privateKey = await db.getFaucetPrivateKey(req.params.id)
        if (!privateKey)
            throw new Error('Could not get private key. Please retry.');

        res.status(200).json({ privateKey });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id.privateKey', error });
        res.status(400).send(error.message);
    }
});

router.post('/:id/drip', workspaceAuth, async (req, res) => {
    const data = req.body.data;
    let lock, isLockAcquired;

    try {
        if (!data.address)
            throw new Error('Missing parameters');

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            throw new Error('Could not find faucet');
        if (!faucet.active && !req.query.authenticated)
            throw new Error('Could not find faucet');

        let cooldown = await db.getFaucetCooldown(req.params.id, data.address);
        if (cooldown > 0)
            throw new Error(`Too soon to claim more tokens for this address. Try again in ${moment.duration(cooldown, 'minutes').humanize()}.`);

        lock = new Lock(`${faucet.id}-${data.address}`, 60000);

        isLockAcquired = await lock.acquire();
        if (!isLockAcquired)
            throw new Error('We are still processing a request for this address. Please try again in a few seconds.');

        await lock.acquire();

        const privateKey = await db.getFaucetPrivateKey(req.params.id);
        if (!privateKey)
            throw new Error('Could not obtain faucet private key. Please retry.');

        const walletConnector = new WalletConnector(req.query.workspace.rpcServer, privateKey);

        let tx;
        try {
            tx = await walletConnector.send(data.address, faucet.amount);
        } catch(error) {
            if (error.code === 'INSUFFICIENT_FUNDS')
                throw new Error('Insufficient funds. Refill the faucet and try again.');
            else
                throw error;
        }

        if (!tx || !tx.hash)
            throw new Error("Couldn't create transaction. Please retry.")

        await db.createFaucetDrip(req.params.id, data.address, faucet.amount, tx.hash);
        cooldown = await db.getFaucetCooldown(req.params.id, data.address);

        await lock.release();

        res.status(200).json({ hash: tx.hash, cooldown });
    } catch(error) {
        if (lock && isLockAcquired)
            await lock.release();
        logger.error(error.message, { location: 'post.api.faucets.id.drip', error });
        res.status(400).send(error.message);
    }
});


router.put('/:id/deactivate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.deactivateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id.activate', error });
        res.status(400).send(error.message);
    }
});

router.put('/:id/activate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.activateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id.activate', error });
        res.status(400).send(error.message);
    }
});

router.get('/:id/balance', workspaceAuth, async (req, res) => {
    try {
        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            throw new Error('Could not find faucet');
        if (!faucet.active && !req.query.authenticated)
            throw new Error('Could not find faucet');

        const provider = new ProviderConnector(faucet.explorer.workspace.rpcServer);
        const balance = await provider.getBalance(faucet.address);

        res.status(200).json({ balance: balance.toString() });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id.balance', error });
        res.status(400).send(error.message);
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.amount && !data.interval)
            throw new Error('Missing parameters');
        if (!validateBNString(data.amount))
            throw new Error('Invalid amount.')
        if (isNaN(parseFloat(data.interval)) || parseFloat(data.interval) <= 0)
            throw new Error('Interval must be greater than zero.')

        await db.updateFaucet(data.uid, req.params.id, data.amount, data.interval);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;
