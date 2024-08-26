const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };
    try {
        const result = await db.getAccounts(data.firebaseUserId, data.workspace.name, data.page, data.itemsPerPage, data.orderBy, data.order)

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:address/syncBalance', authMiddleware, async (req, res, next) => {
    const data = { ...req.params, ...req.body.data };
    try {
        if (!data.uid || !data.workspace || !data.balance)
            return managedError(new Error(`Missing parameters.`), req, res);

        await db.updateAccountBalance(data.uid, data.workspace, req.params.address.toLowerCase(), data.balance);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
})

router.post('/:address/privateKey', authMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.privateKey)
            return managedError(new Error(`Missing parameters`), req, res);

        const encryptedPk = encrypt(data.privateKey);
        await db.storeAccountPrivateKey(data.uid, data.workspace, req.params.address.toLowerCase(), encryptedPk);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
