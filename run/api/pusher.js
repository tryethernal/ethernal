const express = require('express');
const Pusher = require('pusher');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: 'eu',
    useTLS: true
});

router.post('/authorization', workspaceAuthMiddleware, async (req, res) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    const authResponse = pusher.authorizeChannel(socketId, channel);
    
    res.status(200).send(authResponse);
});

module.exports = router;
