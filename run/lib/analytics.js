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

    setUser(uid, params = {}) {
        if (!this.token || !uid) return;
        this.mixpanel.people.set(uid, params);
    }

    setSubscription(uid, status, plan, subscriptionCancelsAtPeriodEnd) {
        if (!this.token || status === undefined || !plan || subscriptionCancelsAtPeriodEnd === undefined) return;
        const params = {
            subscriptionStatus: status,
            plan: plan,
            subscriptionCancelsAtPeriodEnd: subscriptionCancelsAtPeriodEnd
        };
        this.mixpanel.people.set(uid, params);
    }
}

module.exports = Analytics;
