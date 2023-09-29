const { Explorer, Workspace, RpcHealthCheck } = require('../models');
const PM2 = require('../lib/pm2');

module.exports = async job => {
    const data = job.data;

    if (!data.explorerSlug)
        return 'Missing parameter.';

    const explorer = await Explorer.findOne({
        where: { slug: data.explorerSlug },
        include: {
            model: Workspace,
            as: 'workspace',
            include: {
                model: RpcHealthCheck,
                as: 'rpcHealthCheck'
            }
        }
    });

    const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);
    const { data: existingProcess } = await pm2.find(data.explorerSlug);

    if (!explorer && existingProcess) {
        await pm2.delete(data.explorerSlug);
        return 'Process deleted: no explorer.';
    }
    else if (!explorer && !existingProcess) {
        return 'No process change.';
    }
    else if (explorer.workspace.rpcHealthCheck && !explorer.workspace.rpcHealthCheck.isReachable && existingProcess) {
        await pm2.delete(data.explorerSlug);
        return 'Process deleted: RPC is not reachable.';
    }
    else if (!explorer.shouldSync && existingProcess) {
        await pm2.delete(explorer.slug);
        return 'Process deleted: sync is disabled.';
    }
    else if (explorer.shouldSync && !existingProcess) {
        await pm2.start(explorer.slug, explorer.workspaceId);
        return 'Process started.';
    }
    else if (explorer.shouldSync && existingProcess && existingProcess.pm2_env.status == 'stopped') {
        await pm2.resume(explorer.slug, explorer.workspaceId);
        return 'Process resumed.';
    }
    else
        return 'No process change.';
};
