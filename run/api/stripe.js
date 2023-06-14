const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../lib/firebase');
const logger = require('../lib/logger');    
const { sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const router = express.Router();

router.post('/cancelExplorerSubscription', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = req.body.data;
    try {
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
        const explorer = await db.getExplorerById(data.user.id, data.explorerId);

        if (!explorer)
            throw new Error(`Can't find explorer.`);

        const stripePlan = await db.getStripePlan(data.newStripePlanSlug);

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

router.post('/createCheckoutSession', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);
        const selectedPlan = await db.getStripePlan(data.plan);

        if (!selectedPlan)
            throw new Error('Invalid plan.');

        if (data.metadata && data.metadata.explorerId) {
            const explorer = await db.getExplorerById(user.id, data.metadata.explorerId)
            if (!explorer)
                throw new Error('Invalid metadata');
        }

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.id,
            customer: user.stripeCustomerId,
            payment_method_types: ['card'],
            subscription_data: { metadata: data.metadata },
            line_items: [
                {
                    price: selectedPlan.stripePriceId,
                    quantity: 1
                }
            ],
            success_url: `${process.env.APP_URL}${data.successPath}`,
            cancel_url: `${process.env.APP_URL}${data.cancelPath}`
        }));
        
        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createCheckoutSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/createPortalSession', [authMiddleware, stripeMiddleware], async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);
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
