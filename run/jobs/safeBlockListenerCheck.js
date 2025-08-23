const { Op } = require('sequelize');
const { OrbitChainConfig } = require('../models');
const { bulkEnqueue } = require('../lib/queue');

module.exports = async () => {
    const orbitParentConfigs = await OrbitChainConfig.findAll({
        where: {
            topParentChainBlockValidationType: {
                [Op.in]: ['SAFE', 'FINALIZED']
            }
        }
    });

    const workspaceIds = [];
    for (const config of orbitParentConfigs) {
        const parentWorkspace = await config.getTopParentWorkspace();
        workspaceIds.push(parentWorkspace.id);
    }

    const uniqueWorkspaceIds = [...new Set(workspaceIds)];

    const jobs = [];
    for (let i = 0; i < uniqueWorkspaceIds.length; i++) {
        const workspaceId = uniqueWorkspaceIds[i];
        console.log(workspaceId);
        jobs.push({
            name: `startSafeBlockListener-${workspaceId}`,
            data: { workspaceId }
        });
    }

    await bulkEnqueue('startSafeBlockListener', jobs);

    return true;
};
