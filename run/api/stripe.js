const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../lib/firebase');
const logger = require('../lib/logger');    
const { sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

const PLANS = {
    premium: 'price_1JlwH8JG8RHJCKOzUJ3nGjT0'
};

router.post('/createCheckoutSession', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        const user = await db.getUser(data.uid);
        const selectedPlan = PLANS[data.plan];

        if (!selectedPlan)
            throw new Error('Invalid plan.');

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.uid,
            customer: user.stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: selectedPlan,
                    quantity: 1
                }
            ],
            success_url: `${process.env.APP_URL}/settings?tab=billing&status=upgraded`,
            cancel_url: `${process.env.APP_URL}/settings?tab=billing`
        }));
        
        res.status(200).json({ url: session.url });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.stripe.createCheckoutSession', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/createPortalSession', authMiddleware, async (req, res) => {
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
