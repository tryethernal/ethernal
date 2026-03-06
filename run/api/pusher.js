/**
 * @fileoverview Pusher/Soketi WebSocket API endpoints.
 * Handles channel authorization for real-time updates.
 * @module api/pusher
 *
 * @route POST /authorization - Authorize WebSocket channel subscription
 */

const express = require('express');
const { pusher } = require('../lib/pusher');
const { managedError, unmanagedError } = require('../lib/errors');
const { isPusherEnabled, isSentryPipelineEnabled } = require('../lib/flags');
const router = express.Router();
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');

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

router.post('/authorization', [presenceMiddleware], async (req, res, next) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    try {
        // Sentry pipeline channel only requires auth (no workspace needed)
        if (channel === 'private-sentry-pipeline') {
            if (!isSentryPipelineEnabled())
                return managedError(new Error('Sentry pipeline is not enabled'), req, res);

            return authMiddleware(req, res, () => {
                const authResponse = pusher.authorizeChannel(socketId, channel);
                res.status(200).send(authResponse);
            });
        }

        // All other channels require workspace auth
        workspaceAuthMiddleware(req, res, () => {
            const authResponse = pusher.authorizeChannel(socketId, channel);
            res.status(200).send(authResponse);
        });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
