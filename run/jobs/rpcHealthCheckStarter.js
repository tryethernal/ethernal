/**
 * @fileoverview RPC health check starter job.
 * Enqueues health checks for all workspaces with enabled RPC monitoring.
 * @module jobs/rpcHealthCheckStarter
 */

const { Workspace, Explorer, StripeSubscription } = require('../models');
const { enqueue } = require('../lib/queue');
const { withTimeout } = require('../lib/utils');

module.exports = async () => {
    const workspaces = await withTimeout(Workspace.findAll({
        where: {
            rpcHealthCheckEnabled: true,
            public: true,
            pendingDeletion: false
        },
        include: {
            model: Explorer,
            as: 'explorer',
            required: true,
            attributes: ['id'], // Only fetch explorer ID to minimize data transfer
            include: {
                model: StripeSubscription,
                as: 'stripeSubscription',
                required: true,
                attributes: ['id'] // Only fetch subscription ID to minimize data transfer
            }
        },
        attributes: ['id'] // Only fetch workspace ID since that's all we need
    }), 30000); // 30 second timeout for database query

    for (let i = 0; i < workspaces.length; i++) {
        const workspace = workspaces[i];
        await enqueue('rpcHealthCheck', `rpcHealthCheck-${workspace.id}`, { workspaceId: workspace.id });
    }

    return true;
};
