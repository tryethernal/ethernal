const { getAppDomain, getDefaultPlanSlug, getDefaultExplorerTrialDays, getStripeSecretKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const express = require('express');
const router = express.Router();
const { isStripeEnabled } = require('../lib/flags');
const { ProviderConnector, DexConnector } = require('../lib/rpc');
const { enqueue } = require('../lib/queue');
const { managedError, unmanagedError } = require('../lib/errors');
const { Explorer } = require('../models');
const { withTimeout, validateBNString, sanitize } = require('../lib/utils');
const { bulkEnqueue } = require('../lib/queue');
const PM2 = require('../lib/pm2');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');
const secretMiddleware = require('../middlewares/secret');

router.post('/:id/v2_dexes', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.routerAddress || !data.wrappedNativeTokenAddress)
            return managedError(new Error('Missing parameters'), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer || !explorer.workspace)
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

        const { id, routerAddress, factoryAddress } = await db.createExplorerV2Dex(data.uid, req.params.id, data.routerAddress, routerFactoryAddress, data.wrappedNativeTokenAddress);

        res.status(200).json({ id, routerAddress, factoryAddress });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/faucets', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.amount || !data.interval)
            return managedError(new Error('Missing parameters'), req, res);
        if (!validateBNString(data.amount))
            return managedError(new Error('Invalid amount.'), req, res);
        if (isNaN(parseFloat(data.interval)) || parseFloat(data.interval) <= 0)
            return managedError(new Error('Interval must be greater than 0.'), req, res);

        const { id, address } = await db.createFaucet(data.uid, req.params.id, data.amount, data.interval);

        res.status(200).json({ id, address });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/billing', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        const user = await db.getUser(data.uid);

        const result = await db.getUserExplorers(user.id, 1, 100);

        const activeExplorers = [];

        for (let i = 0; i < result.items.length; i++) {
            const explorer = result.items[i];

            const stripeSubscription = await db.getStripeSubscription(explorer.id);
            if (!stripeSubscription)
                continue;

            const planName = stripeSubscription.stripePlan.name;;
            let planCost = 0;

            if (stripeSubscription.stripeId) {
                try {
                    const upcomingLines = await stripe.invoices.listUpcomingLines({ subscription: stripeSubscription.stripeId });
                    const amounts = upcomingLines.data.map(line => line.amount && line.amount > 0 ? line.amount : 0);
                    planCost = parseFloat(amounts.reduce((acc, curr) => acc + curr, 0)) / 100;
                } catch(error) {
                    if (error.code == 'invoice_upcoming_none')
                        planCost = 0;
                    else
                        throw error;
                }
            }

            activeExplorers.push({ id: explorer.id, name: explorer.name, planName, planCost, subscriptionStatus: stripeSubscription.formattedStatus });
        };

        const totalCost = activeExplorers.reduce((acc, curr) => acc + curr.planCost, 0);
        res.status(200).json({ activeExplorers, totalCost });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/startTrial', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.stripePlanSlug)
            return managedError(new Error('Missing parameter'), req, res);

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canTrial']);
        if (!user)
            return managedError(new Error('Could not find user.'), req, res);

        if (!user.canTrial)
            return managedError(new Error(`You've already used your trial.`), req, res);

        const explorer = await db.getExplorerById(user.id, req.params.id);
        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        const plan = await db.getStripePlan(data.stripePlanSlug);
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

        const customer = await stripe.customers.retrieve(subscription.customer);

        await db.createExplorerSubscription(user.id, explorer.id,  plan.id, { ...subscription, customer });
        await db.disableUserTrial(user.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/syncExplorers', secretMiddleware, async (req, res, next) => {
    try {
        const explorers = await Explorer.findAll();

        const jobs = [];
        for (let i = 0; i < explorers.length; i++) {
            const explorer = explorers[i];
            jobs.push({
                name: `updateExplorerSyncingProcess-${explorer.id}`,
                data: { explorerSlug: explorer.slug }
            });
        }

        await bulkEnqueue('updateExplorerSyncingProcess', jobs);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/stopSync', [authMiddleware], async (req, res, next) => {
    try {
        if (!req.params.id)
            return managedError(new Error('Missing parameters'), req, res);

        const explorer = await db.getExplorerById(req.body.data.user.id, req.params.id);
        if (!explorer)
            return managedError(new Error(`Couldn't find explorer.`), req, res);

        // We rely on the afterUpdate hook to update the pm2 process. The frontend needs to take care of waiting for the new state
        await db.stopExplorerSync(explorer.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/startSync', [authMiddleware], async (req, res, next) => {
    try {
        if (!req.params.id)
            return managedError(new Error('Missing parameters'), req, res);

        const explorer = await db.getExplorerById(req.body.data.user.id, req.params.id);

        if (!explorer)
            return managedError(new Error(`Couldn't find explorer.`), req, res);

        if (!explorer.stripeSubscription)
            return managedError(new Error(`No active subscription for this explorer.`), req, res);

        if (await explorer.hasReachedTransactionQuota())
            return managedError(new Error('Transaction quota reached. Upgrade your plan to resume sync.'), req, res);

        const provider = new ProviderConnector(explorer.workspace.rpcServer);
        try {
            await withTimeout(provider.fetchNetworkId());
        } catch(error) {
            return managedError(new Error(`This explorer's RPC is not reachable. Please update it in order to start syncing.`), req, res);
        }

        // We rely on the afterUpdate hook to update the pm2 process. The frontend needs to take care of waiting for the new state
        await db.startExplorerSync(explorer.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id/syncStatus', [authMiddleware], async (req, res, next) => {
    try {
        if (!req.params.id)
            return managedError(new Error('Missing parameters'), req, res);

        const explorer = await db.getExplorerById(req.body.data.user.id, req.params.id);
        if (!explorer)
            return managedError(new Error(`Can't find explorer.`), req, res);

        let status;
        if (explorer.workspace.rpcHealthCheck && !explorer.workspace.rpcHealthCheck.isReachable) {
            status = 'unreachable';
        }
        else if (await explorer.hasReachedTransactionQuota()) {
            status = 'transactionQuotaReached';
        }
        else {
            const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);
            const { data: { pm2_env: pm2Process }} = await pm2.find(explorer.slug);
            status = pm2Process ? pm2Process.status : 'stopped';
        }

        res.status(200).json({ status });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id/quotaExtension', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    try {
        const explorer = await db.getExplorerById(req.body.data.user.id, req.params.id);

        if (!explorer || !explorer.stripeSubscription)
            return managedError(new Error(`Can't find explorer.`), req, res);

        if (!explorer.stripeSubscription.stripeQuotaExtension)
            return res.sendStatus(200);

        await stripe.subscriptionItems.del(explorer.stripeSubscription.stripeQuotaExtension.stripeId);

        await db.destroyStripeQuotaExtension(explorer.stripeSubscription.id);

        await explorer.stripeSubscription.reload();

        res.status(200).json({ stripeSubscription: explorer.stripeSubscription });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/quotaExtension', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.quota || !data.stripePlanSlug)
            return managedError(new Error('Missing parameters.'), req, res);

        if (data.quota < 10000)
            return managedError(new Error('Quota extension needs to be at least 10,000.'), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id);

        if (!explorer || !explorer.stripeSubscription)
            return managedError(new Error(`Can't find explorer.`), req, res);

        const stripePlan = await db.getStripePlan(data.stripePlanSlug);
        if (!stripePlan || !stripePlan.capabilities.quotaExtension)
            return managedError(new Error(`Can't find plan.`), req, res);

        const stripeQuotaExtension = explorer.stripeSubscription.stripeQuotaExtension;
        const items = [];

        if (stripeQuotaExtension)
            items.push({ id: stripeQuotaExtension.stripeId, quantity: data.quota });
        else
            items.push({ price: stripePlan.stripePriceId, quantity: data.quota });

        const subscription = await stripe.subscriptions.update(explorer.stripeSubscription.stripeId, {
            cancel_at_period_end: false,
            proration_behavior: 'always_invoice',
            items
        });
        const stripeItem = subscription.items.data.find(i => i.price.id == stripePlan.stripePriceId);

        if (stripeQuotaExtension)
            await db.updateStripeQuotaExtension(explorer.stripeSubscription.id, data.quota);
        else
            await db.createStripeQuotaExtension(explorer.stripeSubscription.id, stripeItem.id, stripePlan.id, data.quota);

        await explorer.stripeSubscription.reload();

        res.status(200).json({ stripeSubscription: explorer.stripeSubscription });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.put('/:id/subscription', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.newStripePlanSlug)
            return managedError(new Error('Missing parameters.'), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id);

        if (!explorer || !explorer.stripeSubscription)
            return managedError(new Error(`Can't find explorer.`), req, res);

        if (explorer.stripeSubscription.stripePlan.slug != data.newStripePlanSlug && explorer.stripeSubscription.isPendingCancelation)
            return managedError(new Error(`Revert plan cancelation before choosing a new plan.`), req, res);

        const stripePlan = await db.getStripePlan(data.newStripePlanSlug);
        if (!stripePlan || !stripePlan.public)
            return managedError(new Error(`Can't find plan.`), req, res);

        let subscription;
        if (explorer.stripeSubscription.stripeId) {
            subscription = await stripe.subscriptions.retrieve(explorer.stripeSubscription.stripeId, { expand: ['customer']});
            await stripe.subscriptions.update(subscription.id, {
                cancel_at_period_end: false,
                proration_behavior: 'always_invoice',
                items: [{
                    id: subscription.items.data[0].id,
                    price: stripePlan.stripePriceId
                }]
            });
        }

        if (explorer.stripeSubscription.isPendingCancelation)
            await db.revertExplorerSubscriptionCancelation(data.user.id, explorer.id);
        else
            await db.updateExplorerSubscription(data.user.id, explorer.id, stripePlan.id, subscription);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/subscription', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.plan)
            return managedError(new Error('Missing parameters.'), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id);

        if (!explorer)
            return managedError(new Error(`Can't find explorer.`), req, res);

        if (explorer.stripeSubscription)
            return managedError(new Error(`Explorer already has a subscription.`), req, res);

        const stripePlan = await db.getStripePlan(data.plan);
        if (!stripePlan || !stripePlan.public)
            return managedError(new Error(`Can't find plan.`), req, res);

        if (!stripePlan.capabilities.skipBilling)
            return managedError(new Error(`This plan cannot be used via the API at the moment. Start the subscription using the dashboard, or reach out to contact@tryethernal.com.`), req, res);

        await db.createExplorerSubscription(data.user.id, explorer.id, stripePlan.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id/subscription', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);

        if (!explorer || !explorer.stripeSubscription)
            return managedError(new Error(`Can't find explorer.`), req, res);

        if (explorer.stripeSubscription.stripeId) {
            const subscription = await stripe.subscriptions.retrieve(explorer.stripeSubscription.stripeId);
            await stripe.subscriptions.update(subscription.id, {
                cancel_at_period_end: true
            });
            await db.cancelExplorerSubscription(data.user.id, explorer.id);
        }
        else
            await db.deleteExplorerSubscription(data.user.id, explorer.id);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/cryptoSubscription', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.stripePlanSlug)
            return managedError(new Error('Missing parameter'), req, res);

        if (!data.user.cryptoPaymentEnabled)
            return managedError(new Error(`Crypto payment is not available for your account. Please reach out to contact@tryethernal.com if you'd like to enable it.`), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id, true);
        if (!explorer)
            return managedError(new Error(`Can't find explorer.`), req, res);

        const stripePlan = await db.getStripePlan(data.stripePlanSlug);
        if (!stripePlan || !stripePlan.public)
            return managedError(new Error(`Can't find plan.`), req, res);

        await stripe.subscriptions.create({
            customer: data.user.stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: getDefaultExplorerTrialDays(),
            items: [
                { price: stripePlan.stripePriceId }
            ],
            metadata: {
                explorerId: explorer.id
            }
        });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            return managedError(new Error(`Could not delete explorer.`), req, res);

        if (data.cancelSubscription && explorer.stripeSubscription) {
            if (explorer.stripeSubscription.stripeId) {
                const subscription = await stripe.subscriptions.retrieve(explorer.stripeSubscription.stripeId);
                await stripe.subscriptions.update(subscription.id, {
                    cancel_at_period_end: true
                });
                await db.cancelExplorerSubscription(data.user.id, explorer.id);
            }
            else
                await db.deleteExplorerSubscription(data.user.id, explorer.id);
        }
        else if (explorer.stripeSubscription)
            return managedError(new Error(`Can't delete an explorer with an active subscription.`), req, res);

        await db.deleteExplorer(data.user.id, req.params.id);

        if (data.deleteWorkspace)
            await db.markWorkspaceForDeletion(explorer.workspaceId);
            await enqueue('workspaceReset', `workspaceReset-${explorer.workspaceId}`, {
                workspaceId: explorer.workspaceId,
                from: new Date(0),
                to: new Date()
            });
            await enqueue('deleteWorkspace', `deleteWorkspace-${explorer.workspaceId}`, {
                workspaceId: explorer.workspaceId
            });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/plans', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    try {
        const plans = await db.getExplorerPlans();

        res.status(200).json(plans);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/quotaExtensionPlan', [authMiddleware, stripeMiddleware], async (req, res, next) => {
    try {
        const plan = await db.getQuotaExtensionPlan();

        res.status(200).json(plan);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/domains', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.domain)
            return managedError(new Error('Missing parameter'), req, res);

        if (data.domain.endsWith(getAppDomain()))
            return managedError(new Error(`You can only have one ${getAppDomain()} domain. If you'd like a different one, update the "Ethernal Domain" field, in the "Settings" panel.`), req, res);

        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        const explorerDomain = await db.createExplorerDomain(explorer.id, data.domain);

        res.status(200).send({ id: explorerDomain.id });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/branding', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        await db.updateExplorerBranding(explorer.id, data);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/:id/settings', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer || !explorer.workspace)
            return managedError(new Error('Could not find explorer.'), req, res);

        if (data.workspace && data.workspace != explorer.workspace.name) {
            const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
            if (!workspace)
                return managedError(new Error('Invalid workspace.'), req, res);
            else
                await db.updateExplorerWorkspace(explorer.id, workspace.id);
        }

        await db.updateExplorerSettings(explorer.id, data);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId && !(data.rpcServer && data.name))
            return managedError(new Error('Missing parameters.'), req, res);

        const user = await db.getUser(data.uid, ['stripeCustomerId', 'canUseDemoPlan']);

        let rpcServer;
        if (data.workspaceId) {
            const workspace = user.workspaces.find(w => w.id == data.workspaceId);
            if (!workspace)
                return managedError(new Error('Could not find workspace'), req, res);
            if (workspace.explorer)
                return managedError(new Error('This workspace already has an explorer.'), req, res);
            rpcServer = workspace.rpcServer;
        }
        else
            rpcServer = data.rpcServer;

        let networkId;
        const provider = new ProviderConnector(rpcServer);
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
            if (!networkId)
                throw 'Error';
        } catch(error) {
            return managedError(new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`), req, res);
        }

        let options = data.workspaceId ?
            { workspaceId: data.workspaceId } :
            {
                name: data.name,
                rpcServer: data.rpcServer,
                networkId,
                tracing: data.tracing === 'true' ? 'other' : null,
            };

        if (data.faucet && data.faucet.amount && data.faucet.interval)
            options['faucet'] = { amount: data.faucet.amount, interval: data.faucet.interval };

        if (data.domains && Array.isArray(data.domains))
            options['domains'] = data.domains;

        options['token'] = data.token;
        options['slug'] = data.slug;
        options['totalSupply'] = data.totalSupply;
        options['l1Explorer'] = data.l1Explorer;
        options['branding'] = data.branding;

        const usingDefaultPlan = !data.plan && (!isStripeEnabled() || user.canUseDemoPlan);
        const planSlug = usingDefaultPlan ? getDefaultPlanSlug() : data.plan;

        if (!planSlug)
            return managedError(new Error('Missing plan parameter.'), req, res);

        const stripePlan = await db.getStripePlan(planSlug);
        if (!stripePlan || !stripePlan.public)
            return managedError(new Error(`Can't find plan.`), req, res);

        if (usingDefaultPlan || stripePlan.capabilities.skipBilling) {
            options['subscription'] = {
                stripePlanId: stripePlan.id,
                stripeId: null,
                cycleEndsAt: new Date(0),
                status: 'active'
            }
        }

        if (stripePlan.capabilities.customStartingBlock)
            options['integrityCheckStartBlockNumber'] = data.startingBlock;

        const explorer = await db.createExplorerFromOptions(user.id, sanitize(options));
        if (!explorer)
            return managedError(new Error('Could not create explorer.'), req, res);

        if (!usingDefaultPlan && req.query.startSubscription) {
            let stripeParams = {
                customer: user.stripeCustomerId,
                items: [
                    { price: stripePlan.stripePriceId }
                ],
                metadata: {
                    explorerId: explorer.id
                }
            };

            if (!user.cryptoPaymentEnabled) {
                const stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
                if (!stripeCustomer.default_source && (!stripeCustomer.invoice_settings || !stripeCustomer.invoice_settings.default_payment_method))
                    return managedError(new Error(`There doesn't seem to be a payment method associated to your account. If you never subscribed to an explorer plan, please start your first one using the dashboard. You can also reach out to support on Discord or at contact@tryethernal.com.`), req, res);
            }
            else {
                stripeParams['collection_method'] = 'send_invoice';
                stripeParams['days_until_due'] = 7;
            }

            await stripe.subscriptions.create(stripeParams);
        }

        const fields = {
            id: explorer.id,
            domain: explorer.domain,
            domains: explorer.domains,
            name: explorer.name,
            slug: explorer.slug,
        };

        if (explorer.faucet) {
            fields['faucet'] = {
                id: explorer.faucet.id,
                address: explorer.faucet.address,
                amount: explorer.faucet.amount,
                interval: explorer.faucet.interval
            }
        }

        res.status(200).send(fields);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/search', async (req, res, next) => {
    const data = req.query;

    try {
        if (!data.domain)
            return managedError(new Error('Missing parameters.'), req, res);

        let explorer;

        if (data.domain == `app.${getAppDomain()}`)
            return res.sendStatus(200);

        if (data.domain.endsWith(getAppDomain())) {
            const slug = data.domain.split(`.${getAppDomain()}`)[0];
            explorer = await db.getPublicExplorerParamsBySlug(slug);
        }

        if (!explorer)
            explorer = await db.getPublicExplorerParamsByDomain(data.domain); // This method will return null if the current explorer plan doesn't have the "customDomain" capability

        if (!explorer)
            return managedError(new Error(`Couldn't find explorer.`), req, res);

        if (!explorer.stripeSubscription)
            return managedError(new Error('This explorer is not active.'), req, res);

        const capabilities = explorer.stripeSubscription.stripePlan.capabilities;

        const fields = {
            id: explorer.id,
            chainId: explorer.chainId,
            domain: explorer.domain,
            domains: explorer.domains,
            l1Explorer: explorer.l1Explorer,
            name: explorer.name,
            rpcServer: explorer.rpcServer,
            slug: explorer.slug,
            admin: explorer.admin,
            workspace: explorer.workspace
        };

        fields['token'] = capabilities.nativeToken ? explorer.token : 'ether';
        fields['themes'] = capabilities.branding ? explorer.themes : { 'default': {}};

        if (explorer.faucet && explorer.faucet.active)
            fields['faucet'] = {
                id: explorer.faucet.id,
                address: explorer.faucet.address,
                amount: explorer.faucet.amount,
                interval: explorer.faucet.interval
            };

        if (explorer.v2Dex && explorer.v2Dex.active)
            fields['v2Dex'] = {
                id: explorer.v2Dex.id,
                routerAddress: explorer.v2Dex.routerAddress
            };

        res.status(200).json({ explorer: fields });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
    const data = req.params;

    try {
        if (!data.id)
            return managedError(new Error('Missing parameters.'), req, res);

        const explorer = await db.getExplorerById(req.body.data.user.id, data.id);

        if (!explorer)
            return managedError(new Error('Could not find explorer.'), req, res);

        res.status(200).json(explorer.toJSON());
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/', authMiddleware, async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };

    try {
        const explorers = await db.getUserExplorers(data.user.id, data.page, data.itemsPerPage, data.order, data.orderBy)

        res.status(200).json(explorers)
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
