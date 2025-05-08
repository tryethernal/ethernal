const GhostAdminAPI = require('@tryghost/admin-api');
const Analytics = require('../lib/analytics');
const { managedWorkerError } = require('../lib/errors');
const db = require('../lib/firebase');
const { getGhostApiKey, getGhostEndpoint } = require('../lib/env');
const { isSelfHosted } = require('../lib/flags');

module.exports = async job => {
    const data = job.data;
    try {

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

        analytics.shutdown();

        if (isSelfHosted())
            return 'Skipping user sync with blog for self-hosted instance';

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
            try {
                await api.members.add({ email: user.email });
            } catch (error) {
                managedWorkerError(error, 'processUser', data, 'lowPriority');
            }
        }
    } catch(error) {
        if (error.context && error.context.startsWith('Member already exists'))
            return;

        throw error;
    }
};
