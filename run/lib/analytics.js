const { PostHog } = require('posthog-node');
const { getPostHogApiKey, getPostHogApiHost } = require('./env');
const { isMarketingEnabled } = require('./flags');

class Analytics {
    constructor() {
        if (!isMarketingEnabled() || !getPostHogApiKey() || !getPostHogApiHost())
            return;
        this.posthog = new PostHog(getPostHogApiKey(), { host: getPostHogApiHost() });
    }

    track(distinctId, event, properties) {
        if (!this.posthog || !distinctId || !event || !isMarketingEnabled) return;
        this.posthog && this.posthog.capture({ distinctId, event, properties });
    }

    shutdown() {
        if (!isMarketingEnabled) return;
        this.posthog && this.posthog.shutdown();
    }
}

module.exports = Analytics;
