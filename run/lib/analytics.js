const { PostHog } = require('posthog-node');
const { getPostHogApiKey, getPostHogApiHost } = require('./env');

class Analytics {
    constructor() {
        if (!getPostHogApiKey() || !getPostHogApiHost())
            return;
        this.posthog = new PostHog(getPostHogApiKey(), { host: getPostHogApiHost() });
    }

    track(distinctId, event, properties) {
        if (!this.posthog || !distinctId || !event) return;
        this.posthog && this.posthog.capture({ distinctId, event, properties });
    }

    shutdown() {
        this.posthog && this.posthog.shutdown();
    }
}

module.exports = Analytics;
