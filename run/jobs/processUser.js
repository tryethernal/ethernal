const GhostAdminAPI = require('@tryghost/admin-api');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');
const { getGhostApiKey, getGhostEndpoint, getMixpanelApiToken } = require('../lib/env');

module.exports = async job => {
    const data = job.data;
    try {
        if (!data.id)
            throw new Error('Missing parameter');

        const user = await db.getUserById(data.id);

        if (!user)
            throw new Error('Cannot find user');

        const ghostApiKey = getGhostApiKey();
        const ghostEndpoint = getGhostEndpoint();

        if (ghostApiKey && ghostEndpoint) {
            const api = new GhostAdminAPI({
                url: process.env.GHOST_ENDPOINT,
                key: process.env.GHOST_API_KEY,
                version: 'v5.0'
            });
            await api.members.add({ email: user.email });
        }

        if (getMixpanelApiToken()) {
            const analytics = new Analytics(getMixpanelApiToken());

            analytics.setUser(data.firebaseUserId, {
                $email: user.email,
                $created: (new Date()).toISOString(),
            });

            analytics.setSubscription(data.firebaseUserId, null, 'free', null, false);
            return analytics.track(data.firebaseUserId, 'Sign Up');
        }
    } catch(error) {
        if (error.context && error.context.startsWith('Member already exists'))
            return;

        throw error;
    }
};
