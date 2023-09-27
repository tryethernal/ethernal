/*
    This job queries the RPC regularly to make sure it's up.
    At the moment, we don't keep the history of healthchecks,
    we just store the latest state & check timestamp.
*/

const models = require('../models');
const db = require('../lib/firebase');
const { withTimeout } = require('../lib/utils');

const Workspace = models.Workspace;

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    const workspace = await Workspace.findOne({
        where: { id: data.workspaceId },
        include: [
            {
                model: models.RpcHealthCheck,
                as: 'rpcHealthCheck',
                require: false
            }
        ]
    });

    if (!workspace)
        throw new Error('Could not find workspace');

   const provider = workspace.getProvider();

   try {
        const latestBlock = await withTimeout(provider.fetchLatestBlock());
        const isReachable = latestBlock !== undefined && latestBlock !== null;
        await db.updateWorkspaceRpcHealthCheck(workspace.id, isReachable);
        return isReachable;
    } catch(error) {
        await db.updateWorkspaceRpcHealthCheck(workspace.id, false);
        return false;
    }
};
