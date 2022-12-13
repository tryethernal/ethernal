const Mixpanel = require('mixpanel');

class Analytics {
    constructor(token) {
        this.token = token;
        if (this.token) {
            this.mixpanel = Mixpanel.init(this.token);
        }
    }

    track(uid, event, params = {}) {
        if (!this.token || !uid) return;
        this.mixpanel.track(event, {
            ...params,
            distinct_id: uid
        });
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
