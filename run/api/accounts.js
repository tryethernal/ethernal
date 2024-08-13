const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');
const authMiddleware = require('../middlewares/auth');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        const result = await db.getAccounts(data.firebaseUserId, data.workspace.name, data.page, data.itemsPerPage, data.orderBy, data.order)

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.accounts', error });
        res.status(400).send(error);
    }
});

router.post('/:address/syncBalance', authMiddleware, async (req, res) => {
    const data = { ...req.params, ...req.body.data };
    try {
        if (!data.uid || !data.workspace || !data.balance)
            throw new Error(`Missing parameters.`);

        await db.updateAccountBalance(data.uid, data.workspace, req.params.address.toLowerCase(), data.balance);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.accounts.address.syncBalance', error });
        res.status(400).send(error);
    }
})

router.post('/:address/privateKey', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.privateKey)
            throw new Error(`Missing parameters`);

        const encryptedPk = encrypt(data.privateKey);
        await db.storeAccountPrivateKey(data.uid, data.workspace, req.params.address.toLowerCase(), encryptedPk);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.accounts.address.privateKey', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
