const { Op } = require('sequelize');
const { enqueue } = require('../lib/queue');
const { Workspace, Explorer, StripeSubscription } = require('../models');

module.exports = async () => {
    const workspaces = await Workspace.findAll({
        where: {
            dataRetentionLimit: {
                [Op.gt]: 0
            },
            '$explorer$': null
        },
        include: 'explorer',
        attributes: ['id', 'dataRetentionLimit']
    });

    const stripeSubscriptions = await StripeSubscription.findAll({
        where: {
            status: ['active', 'trial']
        },
        include: [
            {
                model: Explorer,
                as: 'explorer',
                include: 'workspace'
            },
            'stripePlan'
        ]
    });

    const allWorkspaces = stripeSubscriptions
        .filter(ss => ss.stripePlan.capabilities.dataRetention > 0)
        .map(ss => ({ id: ss.explorer.workspace.id, dataRetentionLimit: ss.stripePlan.capabilities.dataRetention }))
        .concat(workspaces)
        .filter(w => !!w);

    for (let i = 0; i < allWorkspaces.length; i++) {
        const workspace = allWorkspaces[i];
        await enqueue('workspaceReset', `workspaceReset-${workspace.id}`, {
            workspaceId: workspace.id,
            from: new Date(0),
            to: new Date(new Date() - 60 * 60 * 24 * workspace.dataRetentionLimit * 1000)
        });
    }

    return;
};
