/**
 * @fileoverview Sentry instrumentation. Must be required before anything else
 * so the SDK can patch modules as they load.
 *
 * Sampling is deliberately aggressive. On 2026-07-29 the org was ingesting
 * ~3M spans/day against a 5M/month quota — the whole month's allowance in
 * under two days, after which everything is dropped (on-demand spend is 0).
 * The three drivers were: every /api route sampled at 100%, Caddy's on-demand
 * TLS check and the bull-monitor UI counting as "API" traffic, and background
 * queue jobs sampled at 10% while running millions of jobs a day.
 *
 * @module instrument
 */

const {
    getNodeEnv,
    getSentryDsn,
    getVersion,
    getSentryApiSampleRate,
    getSentryQueueSampleRate,
    getSentryDefaultSampleRate
} = require('./lib/env');
const logger = require('./lib/logger');

/**
 * Transactions with no diagnostic value that are hit constantly.
 *
 * - `/api/caddy/validDomain` is Caddy's on-demand TLS lookup, fired on every
 *   handshake for a custom explorer domain (~490k spans/day).
 * - `/bull` is the bull-monitor dashboard polling itself (~50k spans/day).
 *
 * Matched by prefix so sub-paths are covered too.
 */
const UNTRACED_PREFIXES = [
    'GET /api/caddy/validDomain',
    'GET /bull'
];

const API_TRANSACTION = /^(GET|POST|PUT|PATCH|DELETE) \/api/;

/**
 * Decides what fraction of traces to keep.
 *
 * Order matters: noise is dropped before the parent decision is honoured, so a
 * sampled browser trace cannot drag an infrastructure endpoint back in.
 *
 * @param {Object} ctx - Sentry sampling context.
 * @param {string} ctx.name - Transaction name.
 * @param {Object} [ctx.attributes] - Attributes the span was created with.
 * @param {boolean} [ctx.parentSampled] - Upstream sampling decision, if any.
 * @returns {number|boolean} Sample rate, or the inherited decision.
 */
const tracesSampler = ({ name, attributes, parentSampled }) => {
    if (UNTRACED_PREFIXES.some(prefix => name.startsWith(prefix)))
        return 0;

    // Keep distributed traces whole rather than truncating them mid-flight.
    if (parentSampled !== undefined)
        return parentSampled;

    // Background queue work. Every job span carries this attribute (see
    // lib/queue.js and workers/*.js), so job names never need hardcoding here.
    if (attributes && attributes['messaging.destination.name'])
        return getSentryQueueSampleRate();

    if (API_TRANSACTION.test(name))
        return getSentryApiSampleRate();

    return getSentryDefaultSampleRate();
};

if (getSentryDsn()) {
    const Sentry = require('@sentry/node');

    Sentry.init({
        dsn: getSentryDsn(),
        environment: getNodeEnv() || 'development',
        release: `ethernal@${getVersion()}`,
        integrations: [
            Sentry.postgresIntegration
        ],
        beforeSend(event, hint) {
            const err = hint?.originalException;
            if (err && err.sentryIgnore) return null;
            return event;
        },
        tracesSampler
        // No profiling: the plan's profile duration quota is 0, so every
        // profile ever sent was rate-limited and discarded. It cost CPU and
        // bandwidth for data that never arrived.
    });

    logger.info('Started Sentry instrumentation');
}

module.exports = { tracesSampler };
