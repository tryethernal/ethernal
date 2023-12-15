const Sequelize = require('sequelize');
const { Workspace } = require('../models');
const { bulkEnqueue, enqueue } = require('../lib/queue');
const { getMaxBlockForSyncReset } = require('../lib/env');
const Op = Sequelize.Op;

module.exports = async (job) => {
    const data = job.data;

    if (!data.workspaceId || !data.from || !data.to)
        throw new Error('Missing parameter');

    const where = { createdAt: { [Op.between]: [data.from, data.to] }};

    const workspace = await Workspace.findByPk(data.workspaceId);
    if (!workspace)
        throw new Error('Cannot find workspace');

    const blocks = await workspace.getBlocks({ where, attributes: ['id'] });
    const blockIds = blocks.map(b => b.id);

    const blockDeleteJobs = [];
    for (let i = 0; i < blockIds.length; i += getMaxBlockForSyncReset())
        blockDeleteJobs.push({
            name: `batchBlockDelete-${data.workspaceId}-${i}-${i + getMaxBlockForSyncReset()}`,
            data: {
                workspaceId: data.workspaceId,
                ids: blockIds.slice(i, i + getMaxBlockForSyncReset())
            }
        });
    await bulkEnqueue('batchBlockDelete', blockDeleteJobs);

    const contracts = await workspace.getContracts({
        attributes: ['id'],
        where: {
            createdAt: {
                [Op.between]: [data.from, data.to]
            }
        }
    });
    const contractIds = contracts.map(b => b.id);

    await enqueue('batchContractDelete', `batchContractDelete-${data.workspaceId}`, { workspaceId: data.workspaceId, ids: contractIds });

    await workspace.safeDestroyIntegrityCheck();
    await workspace.safeDestroyAccounts();
};
