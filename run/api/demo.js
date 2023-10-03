const express = require('express');
const cors = require('cors');
const router = express.Router();
const { ProviderConnector } = require('../lib/rpc');
const logger = require('../lib/logger');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain } = require('../lib/env');
const db = require('../lib/firebase');

router.post('/explorers', cors({ origin: 'http://app.ethernal.local:8080' }), async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.name || !data.rpcServer)
            throw new Error('Missing parameters.');
        console.log(data.rpcServer)
        const provider = new ProviderConnector(data.rpcServer);
        let networkId;
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
        } catch(error) {
            networkId = null;
        }

        if (!networkId)
            throw new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);

        const user = await db.getUser(getDemoUserId(), ['stripeCustomerId', 'canUseDemoPlan']);

        const workspaceData = {
            name: data.name,
            chain: 'ethereum',
            networkId,
            rpcServer: data.rpcServer,
            public: true,
            tracing: data.tracing,
            dataRetentionLimit: 1
        };

        const explorer = await db.createExplorerWithWorkspace(user.id, workspaceData);
        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());

        if (!stripePlan)
            throw new Error(`Error setting up the explorer. Please retry.`);

        await db.createExplorerSubscription(user.id, explorer.id, stripePlan.id);

        res.status(200).send({ domain: `https://${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.explorers', error: error, data: data });
        res.status(400).send(error);
    }
});

module.exports = router;
