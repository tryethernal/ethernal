/**
 * @fileoverview Standalone Pusher client for Sentry Dashboard real-time updates.
 * @module lib/pusher
 */

import Pusher from 'pusher-js';

let pusher = null;

/**
 * Initialize the Pusher client.
 *
 * @param {string} key - Soketi app key
 * @returns {Pusher} The Pusher instance
 */
export function initPusher(key) {
    if (!key) return null;

    pusher = new Pusher(key, {
        wsHost: window.location.hostname,
        wsPath: '/app',
        forceTLS: window.location.protocol === 'https:',
        enabledTransports: ['ws', 'wss'],
        channelAuthorization: {
            endpoint: '/api/pusher/authorization'
        }
    });

    return pusher;
}

/**
 * Subscribe to sentry pipeline update events.
 *
 * @param {Function} handler - Callback on update
 * @returns {Function} Unsubscribe function
 */
export function onPipelineUpdated(handler) {
    if (!pusher) return () => {};

    const channelString = 'private-sentry-pipeline';
    const channel = pusher.subscribe(channelString);
    channel.bind('updated', handler);
    return () => channel.unbind('updated', handler);
}

/**
 * Subscribe to sentry pipeline turn-added events.
 *
 * @param {Function} handler - Callback when new turns are added to a session
 * @returns {Function} Unsubscribe function
 */
export function onTurnAdded(handler) {
    if (!pusher) return () => {};

    const channelString = 'private-sentry-pipeline';
    const channel = pusher.subscribe(channelString);
    channel.bind('turn-added', handler);
    return () => channel.unbind('turn-added', handler);
}

/**
 * Disconnect and clean up the Pusher client.
 */
export function destroy() {
    if (pusher) {
        pusher.disconnect();
        pusher = null;
    }
}
