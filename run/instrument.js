// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require('@sentry/node');
const { getNodeEnv, getSentryDsn } = require('./lib/env');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: getSentryDsn(),
  environment: getNodeEnv() || 'development',
  integrations: [
    nodeProfilingIntegration(),
    Sentry.postgresIntegration
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});
