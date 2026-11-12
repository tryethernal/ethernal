/**
 * @fileoverview Explorer sync check job.
 * Enqueues sync status updates for all explorers.
 * @module jobs/explorerSyncCheck
 */

const { Explorer } = require('../models');
const { bulkEnqueue } = require('../lib/queue');
const queues = require('../queues');
const logger = require('../lib/logger');

/**
 * Enqueues an updateExplorerSyncingProcess job for every explorer that should sync.
 * Beforehand, removes finished (completed/failed) jobs of that queue: they would otherwise
 * make BullMQ silently drop the enqueue because their jobId is still taken. Failing to clean
 * is logged and never prevents the enqueue.
 *
 * @returns {Promise<boolean>} Always true
 */
module.exports = async () => {
    const explorers = await Explorer.findAll({ where: { shouldSync: true } });

    const jobs = explorers.map(e => ({
        name: `updateExplorerSyncingProcess-${e.id}`,
        data: { explorerSlug: e.slug }
    }));

    try {
        const queue = queues['updateExplorerSyncingProcess'];
        await queue.clean(0, 1000, 'completed');
        await queue.clean(0, 1000, 'failed');
    } catch (error) {
        logger.warn('Failed to clean finished updateExplorerSyncingProcess jobs', { error: error.message, location: 'jobs.explorerSyncCheck' });
    }

    await bulkEnqueue('updateExplorerSyncingProcess', jobs);

    return true;
};
