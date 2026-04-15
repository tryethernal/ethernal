/**
 * @fileoverview Low-priority worker process.
 * Handles cleanup and maintenance jobs: batchBlockDelete, workspaceReset, monitoring.
 * Extended lock duration (300s) for complex deletion operations like batchBlockDelete.
 * @module workers/lowPriority
 */

require('../instrument');
const Sentry = require('@sentry/node');
const { Worker, MetricsTime } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.js');
const { managedWorkerError } = require('../lib/errors');
const { startHeartbeat } = require('../lib/heartbeat');
startHeartbeat('lowPriority');

const db = require('../models');
const workers = [];

priorities['low'].forEach(jobName => {
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
            concurrency: 10,
            maxStalledCount: 5,
            lockDuration: 300000,
            connection,
            metrics: {
                maxDataPoints: MetricsTime.ONE_WEEK * 2,
            }
        }
    );
    worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'lowPriority'));
    workers.push(worker);

    logger.info(`Started worker "${jobName}" - Priority: low`);
});

function shutdown(signal) {
    logger.info(`${signal} received in lowPriority, closing workers...`);
    Promise.all(workers.map(w => w.close()))
        .then(() => db.sequelize.close())
        .then(() => { logger.info('lowPriority shutdown complete'); process.exit(0); })
        .catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 4000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
