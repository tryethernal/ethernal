const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../lib/firebase');
const logger = require('../lib/logger');    
const { sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const router = express.Router();

router.post('/createUserCheckoutSession', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);

        if (!user)
            throw new Error(`Couldn't find user. Check your auth token`);

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.id,
            customer: user.stripeCustomerId,
            line_items: [
                {
                    price: process.env.STRIPE_PREMIUM_PRICE_ID,
                    quantity: 1
                }
            ],
            success_url: `${process.env.APP_URL}/settings?tab=billing&status=upgraded`,
            cancel_url: `${process.env.APP_URL}/settings?tab=billing`
        }));

        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createUserCheckoutSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/createExplorerCheckoutSession', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.explorerId || !data.stripePlanSlug)
            throw new Error('Missing parameter.');

        const user = await db.getUser(data.uid, ['stripeCustomerId']);
        if (!user)
            throw new Error(`Couldn't find user. Check your auth token`);

        const selectedPlan = await db.getStripePlan(data.stripePlanSlug);
        if (!selectedPlan || !selectedPlan.public)
            throw new Error(`Coouldn't find plan.`);

        const explorer = await db.getExplorerById(user.id, data.explorerId)
        if (!explorer)
            throw new Error(`Couldn't find explorer.`);

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.id,
            customer: user.stripeCustomerId,
            subscription_data: { metadata: { explorerId: data.explorerId }},
            line_items: [
                {
                    price: selectedPlan.stripePriceId,
                    quantity: 1
                }
            ],
            success_url: `${process.env.APP_URL}/explorers/${explorer.id}?status=success`,
            cancel_url: `${process.env.APP_URL}/explorers/${explorer.id}`,
        }));

        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createExplorerCheckoutSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/createPortalSession', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = { ...req.query, ...req.body.data };

    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);
        if (!user)
            throw new Error(`Couldn't find user.`);

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.APP_URL}/settings?tab=billing`
        });

        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createPortalSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
