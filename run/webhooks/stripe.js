const { getStripeSecretKey } = require('../lib/env')
const stripe = require('stripe')(getStripeSecretKey());
const express = require('express');
const router = express.Router();
const stripeLib = require('../lib/stripe');
const stripeMiddleware = require('../middlewares/stripe');
const logger = require('../lib/logger');

router.post('/', stripeMiddleware, async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event, response;

        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        } catch (err) {
            throw err.message;
        }
        switch (event.type) {
            case 'invoice.payment_succeeded':
                response = await stripeLib.handleStripePaymentSucceeded(event.data.object)
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.created':
                response = await stripeLib.handleStripeSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                response = await stripeLib.handleStripeSubscriptionDeletion(event.data.object);
                break;
        }

        res.status(200).send(response);
    } catch(error) {
        logger.error(error.message, { location: 'webhooks.stripe', error: error });
        res.status(401).json({ message: error });
    }
});

module.exports = router;
