/**
 * @fileoverview Polls for prospects in 'detected' status and enqueues enrichment jobs.
 * Bridges Hetzner scrapers (raw Postgres inserts) with the BullMQ enrichment pipeline.
 * Runs as a repeatable job every 15 minutes.
 * @module jobs/processDetectedProspects
 */
const { Prospect } = require('../models');
const { enqueue } = require('../lib/queue');
const { isProspectingEnabled } = require('../lib/flags');
const Analytics = require('../lib/analytics');
const logger = require('../lib/logger');

module.exports = async () => {
    if (!isProspectingEnabled()) return;

    const prospects = await Prospect.findAll({
        where: { status: 'detected' },
        order: [['confidenceScore', 'DESC']],
        limit: 10
    });

    if (!prospects.length) return;

    const analytics = new Analytics();
    try {
        for (const prospect of prospects) {
            await enqueue('enrichProspect', `enrichProspect-${prospect.id}`, {
                prospectId: prospect.id
            }, 10, null, null, true);

            analytics.track(null, 'prospect:detected', {
                domain: prospect.domain,
                chainType: prospect.chainType,
                signalSource: prospect.signalSource,
                confidenceScore: prospect.confidenceScore,
                leadType: prospect.leadType
            });

            logger.info('Enqueued enrichment for prospect', { prospectId: prospect.id, domain: prospect.domain });
        }

        logger.info(`Processed ${prospects.length} detected prospects`);
    } finally {
        analytics.shutdown();
    }
};
