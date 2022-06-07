const express = require('express');
const { processTransactions } = require('../lib/transactions');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.userId || !data.workspace || !data.transaction) {
            console.log(data);
            throw '[POST /tasks/transactionProcessing] Missing parameter.';
        }

        await processTransactions(data.userId, data.workspace, [data.transaction]);
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
