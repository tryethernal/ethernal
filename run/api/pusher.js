const express = require('express');
const Pusher = require('pusher');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: 'eu',
    useTLS: true
});

router.get('/authentication', authMiddleware, async (req, res) => {
    const socketId = req.body.socketId;
    const user = await db.getUser(req.body.data.uid);
    if (user) {
        const authResponse = pusher.authenticateUser(socketId, { id: user.id });
        res.status(200).send(authResponse);
    }
    else {
        res.sendStatus(403);
    }
});

router.get('/authorization', authMiddleware, async (req, res) => {
    const socketId = req.body.socketId;
    const channel = req.body.channel_name;

    const workspaceId = channel.split(':')[1];
    const workspaces = await db.getUserWorkspaces(req.body.data.uid);
    for (let i = 0; i < user.workspaces.length; i++) {
        const workspace = user.workspaces[i];
        if (workspaceId == user.workspaceId) {
            const authResponse = pusher.authorizeChannel(socketId, channel);
            return res.status(200).send(authResponse);
        }
    }

    res.sendStatus(403);
});

module.exports = router;
