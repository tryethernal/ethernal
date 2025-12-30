/**
 * @fileoverview PostHog analytics integration for event tracking.
 * @module lib/analytics
 */

const { PostHog } = require('posthog-node');
const { getPostHogApiKey, getPostHogApiHost } = require('./env');

/**
 * Analytics client for tracking user events via PostHog.
 * @class Analytics
 */
class Analytics {
    /**
     * Creates an Analytics instance.
     * Initializes PostHog client if API key and host are configured.
     */
    constructor() {
        if (!getPostHogApiKey() || !getPostHogApiHost())
            return;
        this.posthog = new PostHog(getPostHogApiKey(), { host: getPostHogApiHost() });
    }

    /**
     * Tracks an event for a user.
     * @param {string} distinctId - Unique user identifier
     * @param {string} event - Event name
     * @param {Object} [properties] - Additional event properties
     */
    track(distinctId, event, properties) {
        if (!this.posthog || !distinctId || !event) return;
        this.posthog && this.posthog.capture({ distinctId, event, properties });
    }

    /**
     * Gracefully shuts down the PostHog client.
     * Should be called before process exit.
     */
    shutdown() {
        this.posthog && this.posthog.shutdown();
    }
}

module.exports = Analytics;
