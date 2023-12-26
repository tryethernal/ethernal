const { Op } = require('sequelize');
const { Explorer } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async () => {
    const explorers = await Explorer.findAll({
        where: {
            isDemo: true,
            createdAt: {
                [Op.lt]: new Date(new Date() - 24 * 60 * 60 * 1000)
            }
        },
        include: ['stripeSubscription', 'workspace']
    });

    const deleted = [];
    for (let i = 0; i < explorers.length; i++) {
        const explorer = explorers[i];
        await explorer.safeDeleteSubscription(explorer.stripeSubscription.stripeId);
        await explorer.safeDelete();
        await explorer.workspace.update({ pendingDeletion: true, public: false });
        await enqueue('workspaceReset', `workspaceReset-${explorer.workspaceId}`, {
            workspaceId: explorer.workspaceId,
            from: new Date(0),
            to: new Date()
        });
        await enqueue('deleteWorkspace', `deleteWorkspace-${explorer.workspaceId}`, { workspaceId: explorer.workspaceId });
        deleted.push(explorer.slug);
    }
    return deleted;
};
