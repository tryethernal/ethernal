const { PostHog } = require('posthog-node');
const { getPostHogApiKey } = require('./env');
const { isMarketingEnabled } = require('./flags');

class Analytics {
    constructor() {
        if (!isMarketingEnabled()) return;
        this.posthog = new PostHog(getPostHogApiKey());
    }

    track(distinctId, event, properties) {
        if (!this.posthog || !distinctId || !event || !isMarketingEnabled) return;
        this.posthog.capture({ distinctId, event, properties });
    }

    shutdown() {
        if (!isMarketingEnabled) return;
        this.posthog.shutdown();
    }
}

module.exports = Analytics;
