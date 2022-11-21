const express = require('express');
const router = express.Router();
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
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/syncBalance', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.balance) {
            console.log(data);
            throw new Error(`[POST /api/accounts/${req.params.address}/syncBalance] Missing parameters.`);
        }

        await db.updateAccountBalance(data.uid, data.workspace, req.params.address.toLowerCase(), data.balance);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
})

router.post('/:address/privateKey', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.privateKey) {
            console.log(data);
            throw new Error(`[POST /api/accounts/${address}/privateKey] Missing parameters`);
        }

        const encryptedPk = encrypt(data.privateKey);
        await db.storeAccountPrivateKey(data.uid, data.workspace, req.params.address.toLowerCase(), encryptedPk);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

module.exports = router;
