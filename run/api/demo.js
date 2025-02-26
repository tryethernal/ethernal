const express = require('express');
const axios = require('axios');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain, getDemoTrialSlug, getStripeSecretKey, getDefaultExplorerTrialDays } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { generateSlug } = require('random-word-slugs');
const router = express.Router();
const { ProviderConnector, DexConnector } = require('../lib/rpc');
const { encode, decode } = require('../lib/crypto');
const { withTimeout, sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const db = require('../lib/firebase');
const { managedError, unmanagedError } = require('../lib/errors');

/*
    Creates a uniswap v2 dex for a demo explorer
    The created dex will be limited as it will only have access to tokens
    from liquidity pools deployed after the explorer setup.
    This is good enough for now to show what the dex looks like.
    @param {string} routerAddress - The router address to use for the dex
    @param {string} wrappedNativeTokenAddress - The wrapped native token address to use for the dex
    @returns {object} - The v2 dex object
*/
router.post('/explorers/:id/v2_dexes', async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.routerAddress || !data.wrappedNativeTokenAddress)
            return managedError(new Error('Missing parameters'), req, res);

        const user = await db.getUserById(getDemoUserId());
        if (!user)
            return managedError(new Error('Could not find demo account.'), req, res);

        const explorer = await db.getExplorerById(user.id, req.params.id);
        if (!explorer || !explorer.workspace || !explorer.isDemo)
            return managedError(new Error('Could not find explorer.'), req, res);

        let routerFactoryAddress;
        try {
            const dexConnector = new DexConnector(explorer.workspace.rpcServer, data.routerAddress);
            routerFactoryAddress = await dexConnector.getFactory();
        } catch(error) {
            return managedError(new Error(`Couldn't get factory address for router. Check that the factory method is present and returns an address.`), req, res);
        }

        if (!routerFactoryAddress || typeof routerFactoryAddress != 'string' || routerFactoryAddress.length != 42 || !routerFactoryAddress.startsWith('0x'))
            return managedError(new Error(`Invalid factory address.`), req, res);

        const v2Dex = await db.createExplorerV2Dex(user.firebaseUserId, req.params.id, data.routerAddress, routerFactoryAddress, data.wrappedNativeTokenAddress);

        res.status(200).json({ v2Dex });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

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

/*
    Creates a free demo explorer from a RPC server
    Demo explorers are deleted after 24 hours. They have a banner on the top of the page with
    a link to convert to a free trial.
    Some chainIds are blocked from being used for demo explorers. Those are the ones that have a
    high volume of transactions, already have an explorer, and are likely to be rate limited causing
    the explorer to not function properly.

    @param {string} rpcServer - The RPC server to use for the explorer
    @param {string} name (optional) - The name of the explorer
    @param {string} token (optional) - The native token to use for the explorer
    @returns {object} - The explorer object
*/
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

        const response = await axios.get('https://raw.githubusercontent.com/tryethernal/chainlist/refs/heads/main/constants/chainIds.js', {
            responseType: 'text',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const jsonString = response.data.replace(/^export default\s*/, '');
        const forbiddenChains = JSON.parse(jsonString);

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

        let explorer;
        try {
            explorer = await db.createExplorerFromOptions(user.id, sanitize(options));
        } catch(error) {
            const err = new Error(error);
            if (err.message.includes('workspace with this name'))
                return managedError(new Error('This explorername is already taken. Please choose a different name.'), req, res);
            return managedError(new Error(error), req, res);
        }

        if (!explorer)
            return managedError(new Error('Could not create explorer. Please retry.'), req, res);

        res.status(200).send({ domain: `${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
