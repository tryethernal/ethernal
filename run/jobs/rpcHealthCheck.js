/**
 * @fileoverview RPC health check job.
 * Queries the RPC endpoint to verify reachability and stores status.
 * @module jobs/rpcHealthCheck
 */

const models = require('../models');
const db = require('../lib/firebase');
const { withTimeout } = require('../lib/utils');

const Workspace = models.Workspace;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await withTimeout(Workspace.findOne({
        where: { id: data.workspaceId },
        include: [
            {
                model: models.RpcHealthCheck,
                as: 'rpcHealthCheck',
                require: false
            }
        ]
    }), 30000); // 30 second timeout for database query

    if (!workspace)
        return 'Could not find workspace';

   const provider = workspace.getProvider();

   try {
        const latestBlock = await withTimeout(provider.fetchLatestBlock(), 30000);
        const isReachable = latestBlock !== undefined && latestBlock !== null;
        await withTimeout(db.updateWorkspaceRpcHealthCheck(workspace.id, isReachable), 10000);
        return isReachable;
    } catch(error) {
        await withTimeout(db.updateWorkspaceRpcHealthCheck(workspace.id, false), 10000);
        return false;
    }
};
