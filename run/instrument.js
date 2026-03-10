const { getNodeEnv, getSentryDsn, getVersion } = require('./lib/env');
const logger = require('./lib/logger');

if (getSentryDsn()) {
    const Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    Sentry.init({
        dsn: getSentryDsn(),
        environment: getNodeEnv() || 'development',
        release: `ethernal@${getVersion()}`,
        integrations: [
            nodeProfilingIntegration(),
            Sentry.postgresIntegration
        ],
        tracesSampler: ({ name, inheritOrSampleWith }) => {
            if (name.startsWith('GET /api') || name.startsWith('POST /api') ||
                name.startsWith('PUT /api') || name.startsWith('DELETE /api'))
                return 1.0;
            return inheritOrSampleWith(0.1);
        },
        profilesSampleRate: 0.1
    });
    
    logger.info('Started Sentry instrumentation');
}
