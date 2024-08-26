const express = require('express');
const axios = require('axios');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain, getDemoTrialSlug, getStripeSecretKey, getDefaultExplorerTrialDays } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { generateSlug } = require('random-word-slugs');
const router = express.Router();
const { ProviderConnector } = require('../lib/rpc');
const { encode, decode } = require('../lib/crypto');
const { withTimeout, sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const db = require('../lib/firebase');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/explorers', authMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.token)
            return managedError(new Error('Missing parameter.'), req, res);

        const decodedToken = decode(data.token);
        if (!decodedToken || !decodedToken.explorerId)
            return managedError(new Error('Invalid token.'), req, res);

        const explorer = await db.getExplorerById(getDemoUserId(), decodedToken.explorerId);
        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        const user = await db.getUser(data.uid);
        if (!user)
            return managedError(new Error('Could not find user.'), req, res);

        if (!explorer.isDemo)
            return managedError(new Error('This token has already been used. Please create another demo explorer and try again.'), req, res);

        res.status(200).send({ id: explorer.id, name: explorer.name, rpcServer: explorer.rpcServer, canTrial: user.canTrial });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/migrateExplorer', authMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        if (!data.token)
            return managedError(new Error('Missing parameter.'), req, res);

        const decodedToken = decode(data.token);
        if (!decodedToken || !decodedToken.explorerId)
            return managedError(new Error('Invalid token.'), req, res);

        const explorer = await db.getExplorerById(getDemoUserId(), decodedToken.explorerId);
        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        if (!explorer.isDemo)
            return managedError(new Error('This token has already been used. Please create another demo explorer and try again.'), req, res);

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canTrial']);
        if (!user)
            return managedError(new Error('Could not find user.'), req, res);

        if (!user.canTrial)
            return managedError(new Error(`You've already used your trial.`), req, res);

        const plan = await db.getStripePlan(getDemoTrialSlug());
        if (!plan)
            return managedError(new Error('Could not find plan.'), req, res);

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
            return managedError(new Error('Error while starting trial. Please try again.'), req, res);

        res.status(200).send({ explorerId: explorer.id });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/explorers', async (req, res, next) => {
    const data = req.body;
    try {
        if (!data.rpcServer)
            return managedError(new Error('Missing parameters.'), req, res);

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

        const forbiddenChains = (await axios.get('https://raw.githubusercontent.com/DefiLlama/chainlist/main/constants/chainIds.json')).data;
        if (forbiddenChains[networkId])
            return managedError(new Error(`You can't create a demo with this network id (${networkId} - ${forbiddenChains[networkId]}). If you'd still like an explorer for this chain. Please reach out to contact@tryethernal.com, and we'll set one up for you.`), req, res);

        if (!networkId)
            return managedError(new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`), req, res);

        const user = await db.getUserById(getDemoUserId());

        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());
        if (!stripePlan)
            return managedError(new Error('Error setting up the explorer. Please retry.'), req, res);

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
            },
            faucet: {
                amount: 10000000000000000,
                interval: 10
            }
        };

        const explorer = await db.createExplorerFromOptions(user.id, sanitize(options));
        if (!explorer)
            return managedError(new Error('Could not create explorer. Please retry.'), req, res);

        res.status(200).send({ domain: `${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
