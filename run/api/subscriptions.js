const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const { bulkEnqueue } = require('../lib/queue');
const { StripeSubscription } = require('../models');
const secretMiddleware = require('../middlewares/secret');

router.post('/processAll', secretMiddleware, async (req, res) => {
    try {
        const subscriptions = await StripeSubscription.findAll({
            where: { status: 'active' }
        });

        const jobs = subscriptions.map(s => ({
            name: `processStripeSubscription-${s.id}`,
            data: {
                stripeSubscriptionId: s.id,
                explorerId: s.explorerId
            }
        }));

        await bulkEnqueue('processStripeSubscription', jobs);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.subscriptions.processAll', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;
