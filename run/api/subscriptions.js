const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const { enqueue } = require('../lib/queue');
const secretMiddleware = require('../middlewares/secret');

router.post('/processAll', secretMiddleware, async (req, res) => {
    try {
        await enqueue('subscriptionCheck', 'subscriptionCheck', {});
        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.subscriptions.processAll', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;
