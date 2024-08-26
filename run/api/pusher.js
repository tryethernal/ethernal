const express = require('express');
const { pusher } = require('../lib/pusher');
const { managedError, unmanagedError } = require('../lib/errors');
const { isPusherEnabled } = require('../lib/flags');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

const presenceMiddleware = async (req, res, next) => {
    try {
        if (isPusherEnabled())
            next();
        else
            return managedError(new Error('Pusher is not enabled'), req, res);
    } catch(error) {
        unmanagedError(error, req, next);
    }
};

router.post('/authorization', [presenceMiddleware, workspaceAuthMiddleware], async (req, res, next) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    try {
        const authResponse = pusher.authorizeChannel(socketId, channel);
        
        res.status(200).send(authResponse);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
