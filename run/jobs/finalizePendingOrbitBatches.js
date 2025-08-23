const { OrbitBatch, OrbitChainConfig } = require('../models');
const { Op } = require('sequelize');

module.exports = async () => {

    const orbitParentConfigs = await OrbitChainConfig.findAll({
        where: {
            topParentChainBlockValidationType: {
                [Op.in]: ['SAFE', 'FINALIZED']
            }
        }
    });

    const workspaces = {};
    for (const config of orbitParentConfigs) {
        const parentWorkspace = await config.getTopParentWorkspace();
        const orbitChildConfigs = await parentWorkspace.getOrbitChildConfigs();
        workspaces[parentWorkspace.id] = { ...parentWorkspace.toJSON(), orbitChildConfigs, client: parentWorkspace.getViemPublicClient() };
    }

    let pendingBatches = [];
    for (const workspace of Object.values(workspaces)) {
        const block = await workspace.client.getBlock({ blockTag: 'safe' });
        for (const orbitChildConfig of workspace.orbitChildConfigs) {
            console.log(`Validating batches posted on ${workspace.name} by config ${orbitChildConfig.workspaceId} with block number ${block.number}`);
            const pendingBatches = await OrbitBatch.findAll({
                where: {
                    workspaceId: orbitChildConfig.workspaceId,
                    confirmationStatus: 'pending',
                    parentChainBlockNumber: {
                        [Op.lt]: Number(block.number)
                    }
                }
            });

            for (const batch of pendingBatches) {
                await batch.confirm();
            }
        }
    }

    return pendingBatches.map(batch => batch.id);
};
