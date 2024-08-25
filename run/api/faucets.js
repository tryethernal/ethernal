const express = require('express');
const moment = require('moment');
const router = express.Router();
const db = require('../lib/firebase');
const Lock = require('../lib/lock');
const { validateBNString } = require('../lib/utils')
const { ProviderConnector, WalletConnector } = require('../lib/rpc');
const authMiddleware = require('../middlewares/auth');
const workspaceAuth = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/:id/transactionHistory', workspaceAuth, async (req, res, next) => {
    const data = req.query;

    try {
        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            return managedError(new Error('Could not find faucet'), req, res);

        const { rows: transactions, count } = await db.getFaucetTransactionHistory(faucet.id, data.page, data.itemsPerPage, data.order, data.orderBy);

        res.status(200).json({ transactions, count });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/tokenVolume', workspaceAuth, async (req, res, next) => {
    const data = req.query;

    try {
        if (!data.from || !data.to)
            return managedError(new Error('Missing parameter'), req, res);

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            return managedError(new Error('Could not find faucet'), req, res);

        const tokens = await db.getFaucetTokenVolume(faucet.id, data.from, data.to);

        res.status(200).json(tokens);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/requestVolume', workspaceAuth, async (req, res, next) => {
    const data = req.query;

    try {
        if (!data.from || !data.to)
            return managedError(new Error('Missing parameter'), req, res);

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            return managedError(new Error('Could not find faucet'), req, res);

        const requests = await db.getFaucetRequestVolume(faucet.id, data.from, data.to);

        res.status(200).json(requests);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.deleteFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/privateKey', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        const isAllowed = await db.ownFaucet(data.uid, req.params.id);
        if (!isAllowed)
            return managedError(new Error('Could not find faucet'), req, res);
        const privateKey = await db.getFaucetPrivateKey(req.params.id)
        if (!privateKey)
            return managedError(new Error('Could not get private key. Please retry.'), req, res);

        res.status(200).json({ privateKey });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/drip', workspaceAuth, async (req, res, next) => {
    const data = req.body.data;
    let lock, isLockAcquired;

    try {
        if (!data.address)
            return managedError(new Error('Missing parameters'), req, res);

        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            return managedError(new Error('Could not find faucet'), req, res);
        if (!faucet.active && !req.query.authenticated)
            return managedError(new Error('Could not find faucet'), req, res);

        let cooldown = await db.getFaucetCooldown(req.params.id, data.address);
        if (cooldown > 0)
            return managedError(new Error(`Too soon to claim more tokens for this address. Try again in ${moment.duration(cooldown, 'minutes').humanize()}.`), req, res);

        lock = new Lock(`${faucet.id}-${data.address}`, 60000);

        isLockAcquired = await lock.acquire();
        if (!isLockAcquired)
            return managedError(new Error('We are still processing a request for this address. Please try again in a few seconds.'), req, res);

        await lock.acquire();

        const privateKey = await db.getFaucetPrivateKey(req.params.id);
        if (!privateKey)
            return managedError(new Error('Could not obtain faucet private key. Please retry.'), req, res);

        const walletConnector = new WalletConnector(req.query.workspace.rpcServer, privateKey);

        let tx;
        try {
            tx = await walletConnector.send(data.address, faucet.amount);
        } catch(error) {
            if (error.code === 'INSUFFICIENT_FUNDS')
                return managedError(new Error('Insufficient funds. Refill the faucet and try again.'), req, res);
            else
                return unmanagedError(error, req, next);
        }

        if (!tx || !tx.hash)
            return managedError(new Error("Couldn't create transaction. Please retry."), req, res);

        await db.createFaucetDrip(req.params.id, data.address, faucet.amount, tx.hash);
        cooldown = await db.getFaucetCooldown(req.params.id, data.address);

        await lock.release();

        res.status(200).json({ hash: tx.hash, cooldown });
    } catch(error) {
        if (lock && isLockAcquired)
            await lock.release();
        unmanagedError(error, req, next);
    }
});


router.put('/:id/deactivate', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.deactivateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/activate', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.activateFaucet(data.uid, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/balance', workspaceAuth, async (req, res, next) => {
    try {
        const faucet = await db.getFaucet(req.params.id)
        if (!faucet)
            return managedError(new Error('Could not find faucet'), req, res);
        if (!faucet.active && !req.query.authenticated)
            return managedError(new Error('Could not find faucet'), req, res);

        const provider = new ProviderConnector(faucet.explorer.workspace.rpcServer);
        const balance = await provider.getBalance(faucet.address);

        res.status(200).json({ balance: balance.toString() });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.amount && !data.interval)
            return managedError(new Error('Missing parameters'), req, res);
        if (!validateBNString(data.amount))
            return managedError(new Error('Invalid amount.'), req, res);
        if (isNaN(parseFloat(data.interval)) || parseFloat(data.interval) <= 0)
            return managedError(new Error('Interval must be greater than zero.'), req, res);

        await db.updateFaucet(data.uid, req.params.id, data.amount, data.interval);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;