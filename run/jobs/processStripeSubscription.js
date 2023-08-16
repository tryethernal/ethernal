const { Explorer } = require('../models');
const PM2 = require('../lib/pm2');

module.exports = async job => {
    const data = job.data;

    if (!data.explorerSlug)
        return 'Missing parameter.';

    const explorer = await Explorer.findOne({ where: { slug: data.explorerSlug }});

    const pm2 = new PM2(process.env.PM2_HOST, process.env.PM2_SECRET);

    if (!explorer) {
        await pm2.delete(data.explorerSlug);
        return 'Process deleted (no explorer).';
    }

    const stripeSubscription = await explorer.getStripeSubscription();

    // This means the subscription is cancelled, we stop the syncing process
    if (!stripeSubscription) {
        await pm2.delete(explorer.slug);
        return 'Process deleted (no subscription).';
    }

    // We check if we have a current process running
    const { data: existingProcess } = await pm2.find(explorer.slug);

    // If the process doesn't exist or is not running, we create it
    if (!existingProcess) {
        await pm2.start(explorer.slug, explorer.workspaceId);
        return 'Process created.';
    }

    return 'No process change.';
};
