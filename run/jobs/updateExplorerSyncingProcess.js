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

    // We check if we have a current process running
    const { data: existingProcess } = await pm2.find(explorer.slug);

    if (!explorer.shouldSync && existingProcess && existingProcess.status != 'stopped') {
        await pm2.stop(explorer.slug);
        return 'Process stopped.';
    }

    // If the process doesn't exist or is not running, we create it
    if (explorer.shouldSync && (!existingProcess || existingProcess.status != 'online')) {
        await pm2.start(explorer.slug, explorer.workspaceId);
        return 'Process started.';
    }

    return 'No process change.';
};
