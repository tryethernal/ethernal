/**
 * @fileoverview Explorer sync check job.
 * Enqueues sync status updates for all explorers.
 * @module jobs/explorerSyncCheck
 */

const { Explorer } = require('../models');
const { bulkEnqueue } = require('../lib/queue');

module.exports = async () => {
    const explorers = await Explorer.findAll();

    const jobs = explorers.map(e => ({
        name: `updateExplorerSyncingProcess-${e.id}`,
        data: { explorerSlug: e.slug }
    }));

    await bulkEnqueue('updateExplorerSyncingProcess', jobs);

    return true;
};
