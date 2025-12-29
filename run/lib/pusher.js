/**
 * @fileoverview Real-time notification system using Pusher/Soketi.
 * Provides WebSocket-based event triggering for live updates to clients.
 * @module lib/pusher
 */

const Pusher = require('pusher');
const logger = require('./logger');
const { isPusherEnabled } = require('./flags');
const { getSoketiDefaultAppId, getSoketiDefaultAppKey, getSoketiDefaultAppSecret, getSoketiHost, getSoketiPort, getSoketiScheme, getSoketiUseTLS } = require('./env');

/**
 * Pusher/Soketi client instance.
 * Falls back to a no-op stub if Pusher is not enabled.
 * @type {Pusher}
 */
const pusher = isPusherEnabled() ?
    new Pusher({
        appId: getSoketiDefaultAppId(),
        key: getSoketiDefaultAppKey(),
        secret: getSoketiDefaultAppSecret(),
        host: getSoketiHost(),
        port: getSoketiPort(),
        scheme: getSoketiScheme(),
        useTLS: getSoketiUseTLS()
    }) :
    { trigger: () => new Promise(resolve => resolve()) };

module.exports = {
    pusher,

    /**
     * Triggers a Pusher event on a channel.
     * Silently handles errors by logging them.
     *
     * @param {string} channel - Channel name (e.g., 'private-blocks;workspaceId=1')
     * @param {string} event - Event name (e.g., 'new', 'updated', 'deleted')
     * @param {Object} data - Event payload data
     * @example
     * trigger('private-blocks;workspaceId=123', 'new', { blockNumber: 100 });
     */
    trigger: (channel, event, data) => {
        if (isPusherEnabled()) {
            pusher.trigger(channel, event, data)
                .catch(error => {
                    logger.error(error.message, { location: 'lib.pusher', error, channel, event, data });
                });
        }
    }
};
