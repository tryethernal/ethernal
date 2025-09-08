const logger = require('../lib/logger');
const { OrbitBatch, Workspace } = require('../models');
const { Op } = require('sequelize');

module.exports = async () => {

    const workspaces = await Workspace.findAll({ where: { isTopOrbitParent: true } });

    let allPendingBatches = [];
    for (const workspace of workspaces) {
        const client = workspace.getViemPublicClient();
        const block = await client.getBlock({ blockTag: 'safe' });
        for (const orbitChildConfig of workspace.orbitChildConfigs) {
            logger.info(`Validating batches posted on ${workspace.name} by config ${orbitChildConfig.workspaceId} with block number ${block.number}`);
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

            allPendingBatches = allPendingBatches.concat(pendingBatches);
        }
    }

    return allPendingBatches.map(batch => batch.id);
};
