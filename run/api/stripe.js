const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../lib/firebase');
const logger = require('../lib/logger');    
const { sanitize } = require('../lib/utils');
const { getAppUrl } = require('../lib/env');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const router = express.Router();

const EXPLORER_TRIAL_DAYS = 7;

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
            success_url: `${getAppUrl()}/settings?tab=billing&status=upgraded`,
            cancel_url: `${getAppUrl()}/settings?tab=billing`
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

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canTrial']);
        if (!user)
            throw new Error(`Couldn't find user. Check your auth token`);

        const selectedPlan = await db.getStripePlan(data.stripePlanSlug);
        if (!selectedPlan || !selectedPlan.public)
            throw new Error(`Coouldn't find plan.`);

        const explorer = await db.getExplorerById(user.id, data.explorerId)
        if (!explorer)
            throw new Error(`Couldn't find explorer.`);

        const trial_settings = user.canTrial ? {
            end_behavior: { missing_payment_method: 'cancel' }
        } : null;
        const payment_method_collection = user.canTrial ? 'if_required' : 'always';

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.id,
            customer: user.stripeCustomerId,
            payment_method_collection,
            subscription_data: sanitize({
                metadata: { explorerId: data.explorerId },
                trial_period_days: user.canTrial ? EXPLORER_TRIAL_DAYS : null,
                trial_settings
            }),
            line_items: [
                {
                    price: selectedPlan.stripePriceId,
                    quantity: 1
                }
            ],
            success_url: data.successUrl,
            cancel_url: data.cancelUrl,
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
            return_url: data.returnUrl
        });

        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createPortalSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
