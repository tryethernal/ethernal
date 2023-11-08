const GhostAdminAPI = require('@tryghost/admin-api');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');
const { getGhostApiKey, getGhostEndpoint } = require('../lib/env');
const { isMarketingEnabled } = require('../lib/flags');

module.exports = async job => {
    const data = job.data;
    try {
        if (!isMarketingEnabled())
            return 'Marketing is not enabled';

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

        const analytics = new Analytics();
        analytics.track(user.id, 'auth:user_signup', {
            $set: {
                email: user.email,
                plan: 'free',
                can_trial: true
            },
            $set_once: {
                created_at: user.createdAt
            }
        });

        return analytics.shutdown();
    } catch(error) {
        if (error.context && error.context.startsWith('Member already exists'))
            return;

        throw error;
    }
};
