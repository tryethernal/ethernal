const { Workspace } = require('../models');

module.exports = async (job) => {
    const data = job.data;

    if (!data.workspaceId || !data.ids)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(data.workspaceId);

    return workspace.safeDestroyContracts(data.ids);
};
