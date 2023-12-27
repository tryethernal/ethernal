const { Workspace } = require('../models');
const { getMaxBlockForSyncReset, getMaxContractForReset } = require('../lib/env');
const { enqueue } = require('../lib/queue');

const RETRY_DELAY = 60 * 60 * 1000;

module.exports = async job => {
    const data = job.data;

    const workspace = await Workspace.findByPk(data.workspaceId);

    if (!workspace)
        return 'Cannot find workspace';

    if (!workspace.pendingDeletion)
        return 'This workspace has not been marked for deletion';

    const blocks = await workspace.getBlocks({ limit: getMaxBlockForSyncReset() });
    const contracts = await workspace.getContracts({ limit: getMaxContractForReset() });

    if (blocks.length == getMaxBlockForSyncReset() || contracts.length == getMaxContractForReset()) {
        await enqueue('deleteWorkspace', `deleteWorkspace-${data.workspaceId}`,
            { workspaceId: data.workspaceId },
            1,
            null,
            RETRY_DELAY
        );
        return 'Too many blocks/contracts for deletion';
    }

    return workspace.safeDelete();
};
