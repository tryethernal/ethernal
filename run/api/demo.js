const express = require('express');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain, getDemoTrialSlug, getStripeSecretKey } = require('../lib/env');
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

        const trial_settings = user.canTrial ? {
            end_behavior: { missing_payment_method: 'cancel' }
        } : null;

        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId,
            items: [{ price: plan.stripePriceId }],
            trial_period_days: 7,
            trial_settings,
            metadata: { explorerId: explorer.id }
        });

        if (!subscription)
            throw new Error('Error while starting trial. Please try again.')

        await db.disableUserTrial(user.id);

        await db.migrateDemoExplorer(explorer.id, user.id, subscription);

        res.status(200).send({ explorerId: explorer.id });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.migrateExplorer', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/explorers', async (req, res) => {
    const data = req.body;
    try {
        if (!data.name || !data.rpcServer)
            throw new Error('Missing parameters.');

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

        const workspaceData = {
            name: generateSlug(),
            chain: 'ethereum',
            networkId,
            rpcServer: data.rpcServer,
            public: true,
            tracing: data.tracing,
            dataRetentionLimit: 1
        };

        const explorer = await db.createExplorerWithWorkspace(user.id, workspaceData, true);
        if (!explorer)
            throw new Error('Could not create explorer. Please retry.');

        await db.makeExplorerDemo(explorer.id);

        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());
        if (!stripePlan)
            throw new Error('Error setting up the explorer. Please retry.');

        await db.createExplorerSubscription(user.id, explorer.id, stripePlan.id);

        await db.updateExplorerSettings(explorer.id, sanitize({
            name: data.name,
            token: data.nativeToken,
        }));

        const jwtToken = encode({ explorerId: explorer.id });
        const banner = `This is a demo explorer that will expire after 24 hours. To set it up permanently,&nbsp;<a href="//app.${getAppDomain()}/transactions?explorerToken=${jwtToken}" target="_blank">click here</a>.`;
        await db.updateExplorerBranding(explorer.id, { banner });

        res.status(200).send({ domain: `${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.explorers', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
