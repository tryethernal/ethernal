const express = require('express');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain, getDemoTrialSlug, getStripeSecretKey, getDefaultExplorerTrialDays } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { generateSlug } = require('random-word-slugs');
const router = express.Router();
const { ProviderConnector } = require('../lib/rpc');
const { encode, decode } = require('../lib/crypto');
const { withTimeout, sanitize } = require('../lib/utils');
const logger = require('../lib/logger');
const authMiddleware = require('../middlewares/auth');
const db = require('../lib/firebase');

router.get('/explorers', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.token)
            throw new Error('Missing parameter.');

        const decodedToken = decode(data.token);
        if (!decodedToken || !decodedToken.explorerId)
            throw new Error('Invalid token.');

        const explorer = await db.getExplorerById(getDemoUserId(), decodedToken.explorerId);
        if (!explorer)
            throw new Error('Could not find explorer.');

        const user = await db.getUser(data.uid);
        if (!user)
            throw new Error('Could not find user.');

        if (!explorer.isDemo)
            throw new Error('This token has already been used. Please create another demo explorer and try again.');

        res.status(200).send({ id: explorer.id, name: explorer.name, rpcServer: explorer.rpcServer, canTrial: user.canTrial });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.demo.explorers', error: error });
        res.status(400).send(error.message);
    }
});

router.post('/migrateExplorer', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.token)
            throw new Error('Missing parameter.');

        const decodedToken = decode(data.token);
        if (!decodedToken || !decodedToken.explorerId)
            throw new Error('Invalid token.');

        const explorer = await db.getExplorerById(getDemoUserId(), decodedToken.explorerId);
        if (!explorer)
            throw new Error('Could not find explorer.');

        if (!explorer.isDemo)
            throw new Error('This token has already been used. Please create another demo explorer and try again.');

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canTrial']);
        if (!user)
            throw new Error('Could not find user.');

        if (!user.canTrial)
            throw new Error(`You've already used your trial.`);

        const plan = await db.getStripePlan(getDemoTrialSlug());
        if (!plan)
            throw new Error('Could not find plan.');

        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: plan.stripePriceId }],
            trial_period_days: getDefaultExplorerTrialDays(),
            trial_settings: {
                end_behavior: { missing_payment_method: 'cancel' }
            },
            metadata: { explorerId: explorer.id }
        });

        if (!subscription)
            throw new Error('Error while starting trial. Please try again.')

        res.status(200).send({ explorerId: explorer.id });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.migrateExplorer', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/explorers', async (req, res) => {
    const data = req.body;
    try {
        if (!data.rpcServer)
            throw new Error('Missing parameters.');

        let name = data.name;
        let slugGenerated = false;
        if (!name) {
            name = generateSlug();
            slugGenerated = true;
        }

        const provider = new ProviderConnector(data.rpcServer);
        let networkId;
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
        } catch(error) {
            networkId = null;
        }

        if (!networkId)
            throw new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);

        const user = await db.getUserById(getDemoUserId());

        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());
        if (!stripePlan)
            throw new Error('Error setting up the explorer. Please retry.');

        const options = {
            name, networkId,
            rpcServer: data.rpcServer,
            dataRetentionLimit: 1,
            token: data.nativeToken,
            isDemo: true,
            subscription: {
                stripePlanId: stripePlan.id,
                stripeId: null,
                cycleEndsAt: new Date(0),
                status: 'active'
            }
        };

        const explorer = await db.createExplorerFromOptions(user.id, sanitize(options));
        if (!explorer)
            throw new Error('Could not create explorer. Please retry.');

        res.status(200).send({ domain: `${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.explorers', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
