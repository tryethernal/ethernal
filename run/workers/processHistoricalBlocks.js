require('../instrument');
const Sentry = require('@sentry/node');
const { Worker, MetricsTime } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const { managedWorkerError } = require('../lib/errors');
const { getHistoricalBlocksProcessingConcurrency } = require('../lib/env');

const worker = new Worker(
    'processHistoricalBlocks',
    job => Sentry.startSpan({
        op: 'queue.process',
        name: 'processHistoricalBlocks',
        attributes: {
            'messaging.destination.name': 'processHistoricalBlocks',
            'messaging.message.id': job.id,
        }
    }, () => jobs['processBlock'](job)),
    {
        concurrency: getHistoricalBlocksProcessingConcurrency(),
        connection,
        metrics: {
            maxDataPoints: MetricsTime.ONE_WEEK * 2,
        }
    }
);
worker.on('failed', (job, error) => managedWorkerError(error, 'processHistoricalBlocks', job.data, 'highPriority'));

module.exports = worker;
