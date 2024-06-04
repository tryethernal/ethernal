const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const Lock = require('../lib/lock');
const { ProviderConnector, WalletConnector } = require('../lib/rpc');
const authMiddleware = require('../middlewares/auth');
const workspaceAuth = require('../middlewares/workspaceAuth');

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

        const allowed = await db.canReceiveFaucetTokens(req.params.id, data.address);
        if (!allowed)
            throw new Error('Too soon to claim more tokens for this address. Try again in');

        lock = new Lock(`${faucet.id}-${data.address}`, 60000);
        isLockAcquired = await lock.acquire();
        if (!isLockAcquired)
            throw new Error('We are still processing a request for this address. Please try again in a few seconds.');

        await lock.acquire();

        const privateKey = await db.getFaucetPrivateKey(req.params.id);
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

        await lock.release();

        res.status(200).json({ hash: tx.hash });
    } catch(error) {
        if (lock && isLockAcquired)
            await lock.release();
        logger.error(error.message, { location: 'post.api.faucets.id.drip', error, data });
        res.status(400).send(error.message);
    }
});


router.put('/:id/deactivate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.deactivateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id.activate', error, data });
        res.status(400).send(error.message);
    }
});

router.put('/:id/activate', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.activateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id.activate', error, data });
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

        await db.updateFaucet(data.uid, req.params.id, data.amount, data.interval);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'put.api.faucets.id', error, data });
        res.status(400).send(error.message);
    }
});

router.get('/:id', workspaceAuth, async (req, res) => {
    const data = req.params;

    try {
        const faucet = await db.getExplorerFaucet(req.params.id);
        if (!faucet)
            throw new Error('Could not find faucet');
        if (!faucet.active && !req.query.authenticated)
            throw new Error('Could not find faucet');

        res.status(200).json(faucet);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.faucets.id', error, data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
