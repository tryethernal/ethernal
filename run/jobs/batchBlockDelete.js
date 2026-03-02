/**
 * @fileoverview Batch block delete job.
 * Deletes a batch of blocks by their IDs.
 * @module jobs/batchBlockDelete
 */

const { Workspace } = require('../models');

module.exports = async (job) => {
    const data = job.data;

    if (!data.workspaceId || !data.ids)
        throw new Error('Missing parameter');

    const workspace = await Workspace.findByPk(data.workspaceId);
    if (!workspace)
        return 'Cannot find workspace';

    return workspace.safeDestroyBlocks(data.ids);
};
