const { Op } = require('sequelize');
const { Explorer, StripeSubscription, StripePlan, Workspace } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async () => {
    const explorers = (await Explorer.findAll({
        include: [
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: {
                    model: StripePlan,
                    as: 'stripePlan',
                    where: {
                        capabilities: {
                            expiresAfter: {
                                [Op.not]: null
                            }
                        }
                    }
                }
            },
            {
                model: Workspace,
                as: 'workspace'
            }
        ]
    })).filter(e => !!e.stripeSubscription);
    
    const deleted = [];
    for (let i = 0; i < explorers.length; i++) {
        const explorer = explorers[i];
        const expiresAfterDays = explorer.stripeSubscription.stripePlan.capabilities.expiresAfter;
        const expirationDate = new Date(explorer.createdAt);
        expirationDate.setDate(expirationDate.getDate() + expiresAfterDays);
        
        const daysDiff = Math.floor((expirationDate - new Date()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 0) {
            await explorer.workspace.update({ pendingDeletion: true, public: false });
            await explorer.safeDelete({ deleteSubscription: true });
            await enqueue('workspaceReset', `workspaceReset-${explorer.workspaceId}`, {
                workspaceId: explorer.workspaceId,
                from: new Date(0),
                to: new Date()
            });
            await enqueue('deleteWorkspace', `deleteWorkspace-${explorer.workspaceId}`, { workspaceId: explorer.workspaceId });
            deleted.push(explorer.slug);
        }
    }
    return deleted;
};
