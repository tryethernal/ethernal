const express = require('express');
const { getStripeSecretKey, getApiEndpoint, getAppUrl } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { randomUUID } = require('crypto');
const uuidAPIKey = require('uuid-apikey');
const { generateSlug } = require('random-word-slugs');
const { ProviderConnector } = require('../lib/rpc');
const { firebaseHash, encrypt, decode }  = require('../lib/crypto');
const { withTimeout } = require('../lib/utils');
const { enqueue } = require('../lib/queue');
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const quicknodeMiddleware = require('../middlewares/quicknode');

const router = express.Router();

const removeWorkspaceAndExplorer = async (req, res) => {
    try {
        const data = req.body;
        const { 'quicknode-id': quicknodeId, 'endpoint-id': quicknodeEndpointId } = data;

        if (!quicknodeId || !quicknodeEndpointId)
            throw new Error('Missing parameters.');

        const user = await db.findQuicknodeUser(quicknodeId);
        if (!user)
            return res.status(200).send({ status: 'success' });

        const explorer = await db.findQuicknodeExplorer(quicknodeId, quicknodeEndpointId);
        if (!explorer)
            return res.status(200).send({ status: 'success' });

        await db.deleteExplorerSubscription(user.id, explorer.id);
        await db.deleteExplorer(user.id, explorer.id);
        await db.markWorkspaceForDeletion(explorer.workspaceId);
        await enqueue('workspaceReset', `workspaceReset-${explorer.workspaceId}`, {
            workspaceId: explorer.workspaceId,
            from: new Date(0),
            to: new Date()
        });
        await enqueue('deleteWorkspace', `deleteWorkspace-${explorer.workspaceId}`, { workspaceId: explorer.workspaceId });

        res.status(200).send({ status: 'success' });
    } catch(error) {
        logger.error(error.message, { location: 'webhooks.quicknode.update', error: error });
        res.status(401).json({ message: error });
    }
};

router.delete('/deprovision', quicknodeMiddleware, removeWorkspaceAndExplorer);
router.delete('/deactivate', quicknodeMiddleware, removeWorkspaceAndExplorer);

router.get('/sso', async (req, res) => {
    try {
        const data = req.query;
        if (!data.jwt)
            throw new Error('Missing parameters.');

        const jwtData = decode(data.jwt);
        const user = await db.findQuicknodeUser(jwtData.quicknode_id)
        if (!user)
            throw new Error('Could not find user.');

        res.redirect(`${getAppUrl()}/sso?explorerId=${user.explorers[0].id}&apiToken=${user.apiToken}`);
    } catch(error) {
        logger.error(error.message, { location: 'webhooks.quicknode.sso', error: error });
        res.status(401).json({ message: error });
    }
});

router.put('/update', quicknodeMiddleware, async (req, res) => {
    try {
        const data = req.body;
        const { 'quicknode-id': quicknodeId, 'endpoint-id': quicknodeEndpointId, plan } = data;

        if (!quicknodeId || !quicknodeEndpointId || !plan)
            throw new Error('Missing parameters.');

        const explorer = await db.findQuicknodeExplorer(quicknodeId, quicknodeEndpointId);
        if (!explorer)
            throw new Error('Cannot find explorer.');

        const stripePlan = await db.getStripePlan(plan);
        if (!stripePlan)
        throw new Error('Cannot find plan.');

        if (explorer.stripeSubscription.stripePlan.slug == stripePlan.slug)
            return res.status(200).send({ status: 'success' });

        await db.updateQuicknodeSubscription(quicknodeId, quicknodeEndpointId, stripePlan.id);

        res.status(200).send({ status: 'success' });
    } catch(error) {
        logger.error(error.message, { location: 'webhooks.quicknode.update', error: error });
        res.status(401).json({ message: error });
    }
});

router.post('/provision', quicknodeMiddleware, async (req, res) => {
    try {
        const data = req.body;

        // const rpcServer = data['wss-url'] || data['http-url'];
        const rpcServer = data['http-url'];
        const { 'quicknode-id': quicknodeId, 'endpoint-id': quicknodeEndpointId, plan } = data;

        if (!rpcServer || !quicknodeId || !quicknodeEndpointId)
            throw new Error('Missing parameters.');

        const provider = new ProviderConnector(rpcServer);
        let networkId;
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
        } catch(error) {
            networkId = null;
        }

        if (!networkId)
            throw new Error(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);

        const stripePlan = await db.getStripePlan(plan);
        if (!stripePlan)
            return res.sendStatus(401);

        let user = await db.findQuicknodeUser(quicknodeId);

        if (!user) {
            const { passwordHash, passwordSalt } = await firebaseHash('antoine');
            const email = `quicknode+${quicknodeId}@tryethernal.com`;
            const clearApiKey = uuidAPIKey.create().apiKey;
            const apiKey = encrypt(clearApiKey);
            const customer = await stripe.customers.create({ email });

            await db.createUser(randomUUID(), { email, apiKey, plan: 'free', stripeCustomerId: customer.id, passwordHash, passwordSalt, qnId: quicknodeId });
            user = await db.findQuicknodeUser(quicknodeId);
        }

        const existingWorkspace = await db.findQuicknodeWorkspace(quicknodeId, quicknodeEndpointId);

        if (existingWorkspace) {
            console.log('Already a workspace with this endpoint id');
            return res.status(200).send({ status: 'success' });
        }
 
        const workspace = await db.createQuicknodeWorkspace(quicknodeId, quicknodeEndpointId, generateSlug(), rpcServer, networkId);

        if (user.explorers.length)
            return res.status(200).send({ status: 'success' });
    
        const explorer = await db.createExplorerFromWorkspace(user.id, workspace.id);
        await db.createExplorerSubscription(user.id, explorer.id, stripePlan.id, {
            status: 'active',
            current_period_end: new Date().setDate(new Date().getDate() + 30) / 1000
        });

        res.status(200).send({ status: 'success', 'access-url': explorer.domain, 'dashboard-url': `${getApiEndpoint()}/webhooks/quicknode/sso` });
    } catch(error) {
        logger.error(error.message, { location: 'webhooks.quicknode.provision', error: error });
        res.status(401).json({ message: error });
    }
});

module.exports = router;
