const models = require('../models');
const PM2 = require('../lib/pm2');

module.exports = async job => {
    const data = job.data;

    if (!data.stripeSubscriptionId || !data.explorerId)
        return 'Missing parameter';

    const explorer = await models.Explorer.findOne({
        where: { id: data.explorerId },
        include: [
            {
                model: models.Workspace,
                as: 'workspace',
            },
            {
                model: models.User,
                as: 'admin'
            }
        ]
    });

    if (!explorer)
        return 'Cannot find explorer';

    const workspace = explorer.workspace;
    const user = explorer.admin;
    const stripeSubscription = await models.StripeSubscription.findByPk(data.stripeSubscriptionId);

    const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);

    // This means the subscription is cancelled, we stop the syncing process
    if (!stripeSubscription) {
        await pm2.delete(explorer.slug);
        return 'Process deleted';
    }

    // We check if we have a current processe running
    const { data: existingProcess } = await pm2.find(explorer.slug);

    // If the process doesn't exist or is not running, we create it
    if (!existingProcess) {
        await pm2.start(explorer.slug, workspace.name, user.apiToken);
        return 'Process created';
    }

    return 'No process change';
};
