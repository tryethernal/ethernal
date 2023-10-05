const express = require('express');
const { generateSlug } = require('random-word-slugs');
const router = express.Router();
const { ProviderConnector } = require('../lib/rpc');
const { encode } = require('../lib/crypto');
const { withTimeout, sanitize } = require('../lib/utils');
const logger = require('../lib/logger');
const { getDemoUserId, getDefaultPlanSlug, getAppDomain } = require('../lib/env');
const db = require('../lib/firebase');

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

        const explorer = await db.createExplorerWithWorkspace(user.id, workspaceData);
        if (explorer) {
            const jwtToken = encode({ explorerId: explorer.id });
            const banner = `
                This is a demo. It will expire after 24 hours. To set this explorer up permanently, <a href="//app.${getAppDomain}/demo/upgradeExplorer?token=${jwtToken}" target="_blank">click here</a>.
            `;
            await db.updateExplorerSettings(explorer.id, sanitize({
                name: data.name,
                token: data.nativeToken,
            }));
            await db.updateExplorerBranding(explorer.id, { banner });
        }
        else
            throw new Error('Could not create explorer. Please retry.');

        const stripePlan = await db.getStripePlan(getDefaultPlanSlug());

        if (!stripePlan)
            throw new Error(`Error setting up the explorer. Please retry.`);

        await db.createExplorerSubscription(user.id, explorer.id, stripePlan.id);

        res.status(200).send({ domain: `${explorer.slug}.${getAppDomain()}` });
    } catch(error) {
        logger.error(error.message, { location: 'post.api.demo.explorers', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
