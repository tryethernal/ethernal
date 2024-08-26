const { initializeApp } = require('firebase-admin/app');
const { getNodeEnv, getSentryDsn, getVersion } = require('../lib/env');
const Sentry = require('@sentry/node');

if (getSentryDsn()) {
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    Sentry.init({
        dsn: getSentryDsn(),
        environment: getNodeEnv() || 'development',
        release: `ethernal@${getVersion()}`,
        skipOpenTelemetrySetup: true,
        integrations: [
            nodeProfilingIntegration(),
            Sentry.postgresIntegration
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0
    });
}
initializeApp();

const { Worker } = require('bullmq');
const connection = require('../config/redis')[process.env.NODE_ENV || 'production'];
const jobs = require('../jobs');
const logger = require('../lib/logger');
const priorities = require('./priorities.json');

priorities['high'].forEach(jobName => {
    const worker = new Worker(
        jobName,
        async job => await jobs[jobName](job),
        { concurrency: 200, maxStalledCount: 5, connection },
    );
    worker.on('failed', (job, error) => {
        Sentry.setTag('worker', 'highPriority');
        Sentry.setTag('job', jobName);
        Sentry.setContext('Job Data', job.data);
        Sentry.captureException(error);
        return logger.error(error.message, {
            location: `workers.highPriority.${jobName}`,
            error: error,
            data: job.data 
        });
    });
    if (process.env.NODE_ENV == 'production')
        logger.info(`Started worker "${jobName}" - Priority: high`);
    else
        console.log(`Started worker "${jobName}" - Priority: high`);
});
