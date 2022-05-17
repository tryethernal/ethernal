const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');
const authMiddleware = require('../middlewares/auth');

router.post('/:address/syncBalance', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.balance) {
            console.log(data);
            throw new Error(`[POST /api/accounts/${address}/syncBalance] Missing parameters.`);
        }

        await db.updateAccountBalance(data.uid, data.workspace, req.params.address, data.balance);

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
        res.status(400).send(error);
    }
});

module.exports = router;
