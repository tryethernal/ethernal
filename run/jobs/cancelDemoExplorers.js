const { Op } = require('sequelize');
const { Explorer } = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async () => {
    const explorers = await Explorer.findAll({
        where: {
            isDemo: true,
            createdAt: {
                [Op.lt]: new Date(new Date() - 60 * 60 * 24 * 1000)
            }
        },
        include: 'stripeSubscription'
    });

    const deleted = [];
    for (let i = 0; i < explorers.length; i++) {
        const explorer = explorers[i];
        if (explorer.stripeSubscription) {
            await explorer.safeDeleteSubscription(explorer.stripeSubscription.stripeId);
            await enqueue('updateExplorerSyncingProcess', `updateExplorerSyncingProcess-${explorer.slug}`, {
                explorerSlug: explorer.slug
            });
            deleted.push(explorer.slug)
        }
    }
    return deleted;
};
