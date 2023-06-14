const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const secretMiddleware = require('../middlewares/secret');
const authMiddleware = require('../middlewares/auth');
const stripeMiddleware = require('../middlewares/stripe');

router.get('/plans', [authMiddleware, stripeMiddleware], async (req, res) => {
    try {
        const plans = await db.getExplorerPlans();

        res.status(200).json(plans);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers.plans', error: error });
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
        logger.error(error.message, { location: 'post.api.explorers.settings', error: error, data: data, queryParams: req.params });
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

router.post('/', [authMiddleware, secretMiddleware], async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.domain || !data.slug || !data.workspaceId || !data.chainId || !data.rpcServer || !data.theme)
            throw new Error('Missing parameters.');

        const user = await db.getUser(data.uid);
        const workspace = user.workspaces.find(w => w.id == data.workspaceId)

        if (!workspace)
            throw new Error('Could not find workspace.');

        const explorer = await db.createExplorer(
            user.id,
            workspace.id,
            data.chainId,
            data.name,
            data.rpcServer,
            data.slug,
            data.theme,
            data.totalSupply,
            data.domain,
            data.token
        );

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
            explorer = await db.getPublicExplorerParamsByDomain(data.domain);

        if (explorer)
            res.status(200).json({ explorer });
        else
            throw new Error('Could not find explorer.');
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
    const data = req.body.data;

    try {
        const explorers = await db.getUserExplorers(data.uid)

        res.status(200).json(explorers)
    } catch(error) {
        logger.error(error.message, { location: 'get.api.explorers', error: error, data: data, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
