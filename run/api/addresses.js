const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

router.get('/:address/transactions', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = req.query;

        const transactions = await db.getAddressTransactions(data.workspace.id, req.params.address, data.page, data.itemsPerPage, data.order);

        res.status(200).json(transactions);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
