// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require('@sentry/node');
const { getNodeEnv } = require('./lib/env');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: 'https://37693f953241a662eda0c015b588ae13@o4507769725452288.ingest.us.sentry.io/4507769725779968',
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
