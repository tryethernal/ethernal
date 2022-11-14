const express = require('express');
const GhostAdminAPI = require('@tryghost/admin-api');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const writeLog = require('../lib/writeLog');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid)
            throw new Error('[POST /tasks/processUser] Missing parameter');

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
        await analytics.track(data.firebaseUserId, 'Sign Up');

        res.sendStatus(200);
    } catch(error) {
        if (error.context && error.context.startsWith('Member already exists'))
            return res.sendStatus(200);

        writeLog({ functionName: 'tasks.processUser', error: error, extra: { data: data }});
        res.sendStatus(400);
    }
})

module.exports = router;
