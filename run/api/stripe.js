const express = require('express');
const { getAppUrl, getStripeSecretKey, getStripePremiumPriceId } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const db = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const router = express.Router();
const { managedError, unmanagedError } = require('../lib/errors');

const EXPLORER_TRIAL_DAYS = 7;

router.post('/createUserCheckoutSession', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);

        if (!user)
            return managedError(new Error(`Couldn't find user. Check your auth token`), req, res);

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.id,
            customer: user.stripeCustomerId,
            line_items: [
                {
                    price: getStripePremiumPriceId(),
                    quantity: 1
                }
            ],
            success_url: `${getAppUrl()}/settings?tab=billing&status=upgraded`,
            cancel_url: `${getAppUrl()}/settings?tab=billing`
        }));

        res.status(200).json({ url: session.url });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/createExplorerCheckoutSession', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.explorerId || !data.stripePlanSlug)
            return managedError(new Error('Missing parameter.'), req, res);

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canTrial']);
        if (!user)
            return managedError(new Error(`Couldn't find user. Check your auth token`), req, res);

        const selectedPlan = await db.getStripePlan(data.stripePlanSlug);
        if (!selectedPlan || !selectedPlan.public)
            return managedError(new Error(`Couldn't find plan.`), req, res);

        const explorer = await db.getExplorerById(user.id, data.explorerId, true)
        if (!explorer)
            return managedError(new Error(`Couldn't find explorer.`), req, res);

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
        unmanagedError(error, req, next);
    }
});

router.post('/createPortalSession', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };

    try {
        const user = await db.getUser(data.uid, ['stripeCustomerId']);
        if (!user)
            return managedError(new Error(`Couldn't find user.`), req, res);

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: data.returnUrl
        });

        res.status(200).json({ url: session.url });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
