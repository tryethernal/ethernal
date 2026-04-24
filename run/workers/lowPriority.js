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

const DEFAULT_CONCURRENCY = 10;

// Cascade-delete jobs that fan out from workspaceReset run at concurrency 1.
// Each batch holds a single transaction with deferred FK constraints across
// many shared rows (transaction_logs, token_transfers, ...). Running them in
// parallel deadlocks on row locks and drains the per-machine Sequelize pool.
// See incident 2026-04-24 (issues #1236-#1239, #1243).
const PER_JOB_CONCURRENCY = {
    batchContractDelete: 1,
    batchBlockDelete: 1,
};

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
            concurrency: PER_JOB_CONCURRENCY[jobName] ?? DEFAULT_CONCURRENCY,
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

    logger.info(`Started worker "${jobName}" - Priority: low - Concurrency: ${PER_JOB_CONCURRENCY[jobName] ?? DEFAULT_CONCURRENCY}`);
});

function shutdown(signal) {
    logger.info(`${signal} received in lowPriority, closing workers...`);
    Promise.all(workers.map(w => w.close()))
        .then(() => require('../models').sequelize.close())
        .then(() => { logger.info('lowPriority shutdown complete'); process.exit(0); })
        .catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 4000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
