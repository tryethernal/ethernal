const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const router = express.Router();
const { isStripeEnabled } = require('../lib/flags');
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');

router.delete('/:id', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        await db.deleteExplorer(data.user.id, req.params.id);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'delete.api.explorers.id', error, data });
        res.status(400).send(error.message);
    }
});

router.get('/plans', [authMiddleware, stripeMiddleware], async (req, res) => {
    try {
        const plans = await db.getExplorerPlans();

        res.status(200).json(plans);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers.plans', error: error });
        res.status(400).send(error.message);
    }
});

router.post('/:id/domains', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.domain)
            throw new Error('Missing parameter');

        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            throw new Error('Could not find explorer.');

        await db.createExplorerDomain(explorer.id, data.domain);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.explorers.id.domains', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:id/branding', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            throw new Error('Could not find explorer.');

        await db.updateExplorerBranding(explorer.id, data);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.explorers.id.branding', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:id/settings', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        const explorer = await db.getExplorerById(data.user.id, req.params.id);
        if (!explorer)
            throw new Error('Could not find explorer.');

        if (data.workspace && data.workspace != explorer.workspace.name) {
            const workspace = await db.getWorkspaceByName(data.uid, data.workspace);
            if (!workspace)
                throw new Error('Invalid workspace.');
            else
                await db.updateExplorerWorkspace(explorer.id, workspace.id);
        }

        await db.updateExplorerSettings(explorer.id, data);

        if (data.statusPageEnabled !== undefined && data.statusPageEnabled !== null)
            await db.updateWorkspaceSettings(data.uid, data.workspace, { statusPageEnabled: data.statusPageEnabled });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.explorers.settings', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.workspaceId)
            throw new Error('Missing parameters.');

        const user = await db.getUser(data.uid, ['stripeCustomerId']);

        const explorer = await db.createExplorerFromWorkspace(user.id, data.workspaceId);

        if (!explorer)
            throw new Error('Could not create explorer.');
        
        if (!isStripeEnabled()) {
            const stripePlan = await db.getStripePlan('self-hosted');
            if (!stripePlan)
                throw new Error(`Can't setup explorer. Make sure you've run npx sequelize-cli db:seed:all`);

            await db.createExplorerSubscription(user.id, explorer.id, stripePlan.id, 'selfhosted', new Date());
        }
        else if (req.query.startSubscription) {
            if (!data.plan)
                throw new Error('Missing plan parameter.');

            const stripePlan = await db.getStripePlan(data.plan);
            if (!stripePlan || !stripePlan.public)
                throw new Error(`Can't find plan`);

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
                if (!stripeCustomer.default_source)
                    throw new Error(`There doesn't seem to be a payment method associated to your account. If you never subscribed to an explorer plan, please start your first one using the dashboard. You can also reach out to support on Discord or at contact@tryethernal.com`);
            }
            else {
                stripeParams['collection_method'] = 'send_invoice';
                stripeParams['days_until_due'] = 7;
            }

            await stripe.subscriptions.create(stripeParams);
        }

        res.status(200).send(explorer);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.explorers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/search', async (req, res) => {
    const data = req.query;

    try {
        if (!data.domain)
            throw new Error('Missing parameters.')

        let explorer;

        if (data.domain == `app.${process.env.APP_DOMAIN}`)
            return res.sendStatus(200);
        else if (data.domain.endsWith(process.env.APP_DOMAIN)) {
            const slug = data.domain.split(`.${process.env.APP_DOMAIN}`)[0];
            explorer = await db.getPublicExplorerParamsBySlug(slug);
        }
        else
            explorer = await db.getPublicExplorerParamsByDomain(data.domain); // This method will return null if the current explorer plan doesn't have the "customDomain" capability

        if (!explorer)
            throw new Error(`Couldn't find explorer`);

        if (!explorer.stripeSubscription)
            throw new Error('This explorer is not active.');

        const capabilities = explorer.stripeSubscription.stripePlan.capabilities;

        if (!capabilities.nativeToken)
            explorer.token = 'ether';
        if (!capabilities.totalSupply)
            explorer.totalSupply = null;
        if (!capabilities.branding)
            explorer.themes = { 'default': {}};

        res.status(200).json({ explorer });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers.search', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    const data = req.params;

    try {
        if (!data.id)
            throw new Error('Missing parameters.')

        const explorer = await db.getExplorerById(req.body.data.user.id, data.id);

        if (!explorer)
            throw new Error('Could not find explorer.');

        res.status(200).json(explorer);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers.id', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/', authMiddleware, async (req, res) => {
    const data = { ...req.body.data, ...req.query };

    try {
        const explorers = await db.getUserExplorers(data.user.id, data.page, data.itemsPerPage, data.order, data.orderBy)

        res.status(200).json(explorers)
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
