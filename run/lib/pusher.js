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
 * Creates Pusher/Soketi configuration with validation and fallbacks.
 * Ensures backend connects to Soketi correctly to prevent 404 errors.
 * @returns {Object} Validated Pusher configuration
 */
function createSoketiConfig() {
    const host = getSoketiHost() || 'ethernal-soketi.internal';
    const port = getSoketiPort() || '6001';
    const scheme = getSoketiScheme() || 'http';
    const useTLS = getSoketiUseTLS() === 'true' || false;

    // Log configuration for debugging WebSocket issues
    logger.info('Soketi configuration', {
        location: 'lib.pusher.createConfig',
        host,
        port,
        scheme,
        useTLS
    });

    return {
        appId: getSoketiDefaultAppId(),
        key: getSoketiDefaultAppKey(),
        secret: getSoketiDefaultAppSecret(),
        host,
        port,
        scheme,
        useTLS
    };
}

/**
 * Pusher/Soketi client instance.
 * Falls back to a no-op stub if Pusher is not enabled.
 * @type {Pusher}
 */
const pusher = isPusherEnabled() ?
    new Pusher(createSoketiConfig()) :
    { trigger: () => new Promise(resolve => resolve()) };

module.exports = {
    pusher,

    /**
     * Triggers a Pusher event on a channel.
     * Handles WebSocket connection errors and provides detailed logging.
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
                    // Enhanced error logging for WebSocket 404 issues
                    const errorContext = {
                        location: 'lib.pusher.trigger',
                        error: error.message,
                        channel,
                        event,
                        data,
                        soketiConfig: {
                            host: getSoketiHost(),
                            port: getSoketiPort(),
                            scheme: getSoketiScheme(),
                            useTLS: getSoketiUseTLS()
                        }
                    };

                    if (error.message && error.message.includes('404')) {
                        logger.error('WebSocket 404 error - check Soketi configuration and connectivity', errorContext);
                    } else {
                        logger.error(error.message, errorContext);
                    }
                });
        }
    }
};
