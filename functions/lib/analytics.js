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
        console.log(`Tracking '${event}' with params: ${JSON.stringify(params)}, for user ${uid}`);
        this.mixpanel.track(event, {
            ...params,
            distinct_id: uid
        });
    }

    setUser(uid, params = {}) {
        if (!this.token || !uid) return;
        console.log(`Setting user '${uid}' with params: ${JSON.stringify(params)}`);
        this.mixpanel.people.set(uid, params);
    }

    setSubscription(uid, status, plan, subscriptionCancelsAtPeriodEnd) {
        if (!this.token || status === undefined || !plan || subscriptionCancelsAtPeriodEnd === undefined) return;
        const params = {
            subscriptionStatus: status,
            plan: plan,
            subscriptionCancelsAtPeriodEnd: subscriptionCancelsAtPeriodEnd
        };
        console.log(`Setting subscription for ${uid} with params: ${JSON.stringify(params)}`);
        this.mixpanel.people.set(uid, params);
    }
}

module.exports = Analytics;
