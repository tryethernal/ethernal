/**
 * @fileoverview Per-workspace queue cap sweep.
 * Scans capped queues and trims jobs for low-tier workspaces that exceed the cap.
 * Catches direct-Redis enqueues from cli-light that bypass the in-process cap check
 * in `lib/queue.enqueue` / `bulkEnqueue`.
 *
 * Runs on a tight schedule (every 10s) so a flood from one workspace can't grow
 * unbounded between sweeps. Previously bundled into queueMonitoring at 120s,
 * which let workspaces overshoot by ~5× under load (see issue #1319).
 *
 * @module jobs/queueCapSweep
 */

const queueCaps = require('../lib/queueCaps');
const logger = require('../lib/logger');

const CAPPED_QUEUES = ['blockSync', 'receiptSync'];

module.exports = async () => {
    for (const queueName of CAPPED_QUEUES) {
        try {
            const cap = queueCaps.getCap(queueName);
            if (cap === Infinity) continue;

            const byWorkspace = await queueCaps.scanQueueByWorkspace(queueName);
            for (const [workspaceId, count] of byWorkspace) {
                if (count <= cap) continue;

                const isLow = await queueCaps.isLowTierWorkspace(workspaceId);
                if (!isLow) continue;

                const excess = count - cap;
                const removed = await queueCaps.trimOldest(queueName, workspaceId, excess);
                if (removed > 0) {
                    logger.info('Sweep trimmed jobs', {
                        queueName, workspaceId, removed, cap, count,
                        location: 'jobs.queueCapSweep',
                    });
                }
            }
        } catch (error) {
            logger.error('Sweep failed', {
                queueName, error: error.message,
                location: 'jobs.queueCapSweep',
            });
        }
    }
};
