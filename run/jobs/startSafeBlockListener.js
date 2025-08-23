const { Workspace } = require('../models');
const PM2 = require('../lib/pm2');

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId)
        return 'Missing parameter.';

    const workspace = await Workspace.findByPk(data.workspaceId, {
        include: 'explorer'
    });

    if (!workspace.explorer)
        return 'Workspace has no explorer.';

    const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);
    const { data: existingProcess } = await pm2.find(`safeBlockListener-${workspace.explorer.slug}`);

    if (existingProcess)
        return 'Process already exists.';

    await pm2.startSafeBlockListener(workspace.explorer.slug, workspace.id);

    return 'Process started.';
};
