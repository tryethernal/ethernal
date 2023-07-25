const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../lib/firebase');
const logger = require('../lib/logger');    
const { sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const router = express.Router();

router.post('/startCryptoSubscription', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.stripePlanSlug || !data.explorerId)
            throw new Error('Missing parameter');

        if (!data.user.cryptoPaymentEnabled)
            throw new Error(`Crypto payment is not available for your account. Please reach out to contact@tryethernal.com if you'd like to enable it.`);

        const stripePlan = await db.getStripePlan(data.stripePlanSlug);
        if (!stripePlan || !stripePlan.public)
            throw new Error(`Can't find plan.`);

        await stripe.subscriptions.create({
            customer: data.user.stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 7,
            items: [
                { price: stripePlan.stripePriceId }
            ],
            metadata: {
                explorerId: data.explorerId
            }
        });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.startCryptoSubscription', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/cancelExplorerSubscription', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.explorerId)
            throw new Error('Missing parameters.');

        const explorer = await db.getExplorerById(data.user.id, data.explorerId);

        if (!explorer || !explorer.stripeSubscription)
            throw new Error(`Can't find explorer.`);

        const subscription = await stripe.subscriptions.retrieve(explorer.stripeSubscription.stripeId);
        await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
        });
        await db.cancelExplorerSubscription(data.user.id, explorer.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.cancelExplorerSubscription', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/updateExplorerSubscription', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.explorerId || !data.newStripePlanSlug)
            throw new Error('Missing parameters.');

        const explorer = await db.getExplorerById(data.user.id, data.explorerId);

        if (!explorer || !explorer.stripeSubscription)
            throw new Error(`Can't find explorer.`);

        const stripePlan = await db.getStripePlan(data.newStripePlanSlug);
        if (!stripePlan || !stripePlan.public)
            throw new Error(`Can't find plan.`);

        const subscription = await stripe.subscriptions.retrieve(explorer.stripeSubscription.stripeId);
        await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: false,
            proration_behavior: 'always_invoice',
            items: [{
                id: subscription.items.data[0].id,
                price: stripePlan.stripePriceId
            }]
        });

        await db.updateExplorerSubscription(data.user.id, explorer.id, stripePlan.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.updateExplorerSubscription', error: error, data: data });
        res.status(400).send(error.message);
    }
});

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
