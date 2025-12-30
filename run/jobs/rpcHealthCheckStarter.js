/**
 * @fileoverview RPC health check starter job.
 * Enqueues health checks for all workspaces with enabled RPC monitoring.
 * @module jobs/rpcHealthCheckStarter
 */

const { Workspace, Explorer, StripeSubscription } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async () => {
    const workspaces = await Workspace.findAll({
        where: {
            rpcHealthCheckEnabled: true,
            public: true,
            pendingDeletion: false
        },
        include: {
            model: Explorer,
            as: 'explorer',
            required: true,
            include: {
                model: StripeSubscription,
                as: 'stripeSubscription',
                required: true
            }
        }
    });

    for (let i = 0; i < workspaces.length; i++) {
        const workspace = workspaces[i];
        await enqueue('rpcHealthCheck', `rpcHealthCheck-${workspace.id}`, { workspaceId: workspace.id });
    }

    return true;
};
