/**
 * @fileoverview Demo explorer API endpoints.
 * Creates and manages demo explorers for trial users.
 * @module api/demo
 *
 * @route POST /explorers/:id/v2_dexes - Create V2 DEX for demo explorer
 * @route GET /explorers - Get demo explorer by token
 * @route POST /migrateExplorer - Migrate demo explorer to user account with trial
 * @route POST /explorers - Create new demo explorer
 */

const express = require('express');
const axios = require('axios');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain, getDemoTrialSlug, getStripeSecretKey, getDefaultExplorerTrialDays, whitelistedNetworkIdsForDemo, maxDemoExplorersForNetwork, getDiscordDemoExplorerChannelWebhook, getLinkupApiKey, getAnthropicApiKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { generateSlug } = require('random-word-slugs');
const router = express.Router();
const { countUp } = require('../lib/counter');
const { ProviderConnector, DexConnector } = require('../lib/rpc');
const { decode } = require('../lib/crypto');
const { enqueue } = require('../lib/queue');
const { withTimeout, sanitize } = require('../lib/utils');
const authMiddleware = require('../middlewares/auth');
const db = require('../lib/firebase');
const { managedError, unmanagedError } = require('../lib/errors');
const { isChainAllowed } = require('../lib/chains');
const logger = require('../lib/logger');
const { isDripEmailEnabled, isProspectingEnabled } = require('../lib/flags');

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

        // Clear grace-period flags set by removeExpiredExplorers
        const workspace = await db.getWorkspaceById(explorer.workspaceId);
        if (workspace && (workspace.pendingDeletion || workspace.deleteAfter))
            await workspace.update({ pendingDeletion: false, public: true, deleteAfter: null });

        // Cancel any pending drip emails now that the user has upgraded
        await db.skipDripEmailsForExplorer(explorer.id);

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
    @param {string} email - The email of the user, we'll send them a link to the explorer
    @param {string} name (optional) - The name of the explorer
    @param {string} token (optional) - The native token to use for the explorer
    @returns {object} - The explorer object
*/
router.post('/explorers', async (req, res, next) => {
    const data = req.body;
    try {
        if (!data.rpcServer || !data.email)
            return managedError(new Error('Missing parameters.'), req, res);

        let name = data.name;
        if (!name) {
            name = generateSlug();
        }

        const provider = new ProviderConnector(data.rpcServer);
        let networkId;
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
        } catch(error) {
            networkId = null;
        }

        if (!networkId)
            return managedError(new Error('Our servers can\'t query this rpc, please use a rpc that is reachable from the internet.'), req, res);

        const allowed = await isChainAllowed(networkId);
        if (!allowed)
            return managedError(new Error('You can\'t create a demo with this network id (' + networkId + '). If you\'d still like an explorer for this chain. Please reach out to contact@tryethernal.com, and we\'ll set one up for you.'), req, res);

        const user = await db.getUserById(getDemoUserId());

        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());
        if (!stripePlan)
            return managedError(new Error('Error setting up the explorer. Please retry.'), req, res);

        const options = {
            name, networkId,
            backendRpcServer: data.rpcServer,
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
                return managedError(new Error('This explorer name is already taken. Please choose a different name.'), req, res);
            return managedError(new Error(error), req, res);
        }

        if (!explorer)
            return managedError(new Error('Could not create explorer. Please retry.'), req, res);

        // Create drip email schedule (steps 1-6) and send step 1 immediately,
        // or fall back to the legacy welcome email when drip is not configured
        if (isDripEmailEnabled()) {
            try {
                const schedules = await db.createDripSchedule(explorer.id, data.email);
                const step1 = schedules.find(s => s.step === 1);
                await enqueue('sendDripEmail', `sendDripEmail-step1-${explorer.id}`, {
                    scheduleId: step1 ? step1.id : null,
                    email: data.email,
                    explorerSlug: explorer.slug,
                    step: 1
                }, 1);
            } catch (error) {
                // Non-blocking: drip schedule failure should not break demo creation
                logger.error(error.message, { location: 'api.demo.createDripSchedule', explorerId: explorer.id, error });
            }

            // Enqueue profile enrichment (async, independent of drip emails)
            if (getLinkupApiKey() && getAnthropicApiKey()) {
                try {
                    await enqueue('enrichDemoProfile', `enrichDemoProfile-${explorer.id}`, {
                        explorerId: explorer.id,
                        email: data.email,
                        rpcServer: data.rpcServer,
                        networkId: networkId ? String(networkId) : null
                    });
                } catch (error) {
                    logger.error(error.message, { location: 'api.demo.enrichDemoProfile', explorerId: explorer.id, error });
                }
            }

            // Capture demo profile for prospecting pipeline
            if (isProspectingEnabled()) try {
                await enqueue('createDemoProfile', `createDemoProfile-${explorer.id}`, {
                    email: data.email,
                    rpcServer: data.rpcServer,
                    chainName: explorer.name,
                    networkId: networkId ? String(networkId) : null,
                    explorerCreatedAt: explorer.createdAt
                });
            } catch (error) {
                logger.error(error.message, { location: 'api.demo.createDemoProfile', explorerId: explorer.id, error });
            }
        } else {
            await enqueue('sendDemoExplorerLink', `sendDemoExplorerLink-${explorer.id}`, { email: data.email, explorerSlug: explorer.slug });
        }

        const discordNotification = '\n**New Demo Explorer**\n\n**User Email:** ' + data.email + '\n**Explorer Name:** ' + (explorer.name || 'N/A') + '\n**Explorer Link:** https://' + explorer.slug + '.' + getAppDomain() + '\n**Explorer RPC:** ' + (data.rpcServer || 'N/A') + '\n';
        await enqueue('sendDiscordMessage', 'sendDiscordMessage-' + explorer.id, { content: discordNotification, channel: getDiscordDemoExplorerChannelWebhook() });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
