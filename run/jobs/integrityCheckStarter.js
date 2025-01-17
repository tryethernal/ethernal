const Sequelize = require('sequelize');
const models = require('../models');
const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const explorers = await models.Explorer.findAll({
        where: {
            shouldSync: true,
            '$stripeSubscription.status$': 'active',
            '$stripeSubscription.stripePlan.slug$': { [Sequelize.Op.not]: 'demo' },
            '$workspace.integrityCheckStartBlockNumber$': { [Sequelize.Op.not]: null },
            '$workspace.skipIntegrityCheck$': false
        },
        include: [
            { model: models.StripeSubscription, as: 'stripeSubscription', include: { model: models.StripePlan, as: 'stripePlan' } },
            { model: models.Workspace, as: 'workspace', include: 'rpcHealthCheck' }
        ]
    });

    for (const explorer of explorers)
        await enqueue('integrityCheck', `integrityCheck-${explorer.workspaceId}`, { workspaceId: explorer.workspaceId });

    return true;
};
