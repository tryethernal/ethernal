const GhostAdminAPI = require('@tryghost/admin-api');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');
const writeLog = require('../lib/writeLog');

module.exports = async job => {
    const data = job.data;
    try {
        if (!data.uid)
            throw new Error('jobs.processUser Missing parameter');

        const user = await db.getUser(data.uid);

        if (process.env.GHOST_API_KEY && process.env.GHOST_ENDPOINT) {
            const api = new GhostAdminAPI({
                url: process.env.GHOST_ENDPOINT,
                key: process.env.GHOST_API_KEY,
                version: 'v5.0'
            });
            await api.members.add({ email: user.email });
        }

        const analytics = new Analytics(process.env.MIXPANEL_API_TOKEN);

        await analytics.setUser(data.firebaseUserId, {
            $email: user.email,
            $created: (new Date()).toISOString(),
        });

        await analytics.setSubscription(data.firebaseUserId, null, 'free', null, false);
        return await analytics.track(data.firebaseUserId, 'Sign Up');
    } catch(error) {
        if (error.context && error.context.startsWith('Member already exists'))
            return res.sendStatus(200);

        throw error;
    }
};
