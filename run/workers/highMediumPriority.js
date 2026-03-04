require('../instrument');
const Sentry = require('@sentry/node');
const { initializeApp } = require('firebase-admin/app');
initializeApp();
const { Worker, MetricsTime } = require('bullmq');
const connection = require('../lib/redis');
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.js');
const { managedWorkerError } = require('../lib/errors');

const tierSettings = {
    high: {
        concurrency: 50,
    },
    medium: {
        concurrency: 50,
        maxStalledCount: 5,
        lockDuration: 300000,
    }
};

['high', 'medium'].forEach(tier => {
    const settings = tierSettings[tier];
    priorities[tier].forEach(jobName => {
        const worker = new Worker(
            jobName,
            job => {
                return Sentry.startSpan(
                    { name: jobName }, () => {
                        return jobs[jobName](job)
                    }
                )
            },
            {
                ...settings,
                connection,
                metrics: {
                    maxDataPoints: MetricsTime.ONE_WEEK * 2,
                }
            }
        );
        worker.on('failed', (job, error) => managedWorkerError(error, jobName, job.data, 'highMediumPriority'));

        logger.info(`Started worker "${jobName}" - Priority: ${tier}`);
    });
});
