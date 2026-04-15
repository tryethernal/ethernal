/**
 * @fileoverview Medium-priority worker process.
 * Handles indexing jobs: processContract, processTokenTransfer, traces.
 * Runs as a separate process from high-priority for event loop isolation.
 * Extended lock duration (300s) and stalled count (5) for longer-running jobs.
 * @module workers/mediumPriority
 */

require('../instrument');
const Sentry = require('@sentry/node');
const { getApps, initializeApp } = require('firebase-admin/app');
if (!getApps().length) initializeApp();
const { Worker, MetricsTime } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.js');
const { managedWorkerError } = require('../lib/errors');
const { startHeartbeat } = require('../lib/heartbeat');
startHeartbeat('mediumPriority');

const db = require('../models');
const workers = [];

priorities['medium'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        job => Sentry.startSpan({
            op: 'queue.process',
            name: jobName,
            attributes: {
                'messaging.destination.name': jobName,
                'messaging.message.id': job.id,
            }
        }, () => jobs[jobName](job)),
        {
            concurrency: 50,
            maxStalledCount: 5,
            lockDuration: 300000,
            connection,
            metrics: {
                maxDataPoints: MetricsTime.ONE_WEEK * 2,
            }
        }
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'mediumPriority'));
    workers.push(worker);

    logger.info(`Started worker "${jobName}" - Priority: medium`);
});

function shutdown(signal) {
    logger.info(`${signal} received in mediumPriority, closing workers...`);
    Promise.all(workers.map(w => w.close()))
        .then(() => db.sequelize.close())
        .then(() => { logger.info('mediumPriority shutdown complete'); process.exit(0); })
        .catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 4000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
