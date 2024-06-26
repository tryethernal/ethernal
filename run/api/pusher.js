const express = require('express');
const { pusher } = require('../lib/pusher');
const logger = require('../lib/logger');
const { isPusherEnabled } = require('../lib/flags');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');

const presenceMiddleware = async (req, res, next) => {
    try {
        if (isPusherEnabled())
            next();
        else
            res.sendStatus(404);
    } catch(error) {
        logger.error(error.message, { location: 'middleware.presenceMiddleware', error: error, data: data });
        res.status(401).send(error);
    }
};

router.post('/authorization', [presenceMiddleware, workspaceAuthMiddleware], async (req, res) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    const authResponse = pusher.authorizeChannel(socketId, channel);
    
    res.status(200).send(authResponse);
});

module.exports = router;
