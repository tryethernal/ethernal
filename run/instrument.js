const { getNodeEnv, getSentryDsn, getVersion } = require('./lib/env');
const logger = require('./lib/logger');

if (getSentryDsn()) {
    const Sentry = require('@sentry/node');
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
    
    logger.info('Started Sentry instrumentation');
}
