/**
 * @fileoverview Redis-backed cache of RPC host capabilities.
 * Avoids re-calling debug_traceTransaction against hosts that have been
 * observed to not support it, or that are chronically too slow to respond
 * within our timeout budget. Self-healing via TTLs — no manual flag flipping
 * and no per-workspace state, so all workspaces sharing an RPC benefit.
 * @module lib/rpcCapabilityCache
 */

const redis = require('./redis');
const logger = require('./logger');

const KEY_PREFIX = 'rpc:cap:';

const UNSUPPORTED_TTL_SEC = 24 * 60 * 60;
const SLOW_TTL_SEC = 60 * 60;
// Widened from 5 min to 1 hour: bt.io-type hosts time out at ~2-3/hour spread
// across workspaces, so the old window reset before 5 could accumulate and
// the slow-mark never fired. 5 timeouts in an hour is still clearly "too
// slow to keep calling" regardless of clustering.
const TIMEOUT_WINDOW_SEC = 60 * 60;
const TIMEOUT_THRESHOLD = 5;

/**
 * Extracts the host portion (host:port) from an RPC server URL.
 * Falls back to the raw input if the URL is unparseable so a malformed
 * server still gets a stable cache key instead of crashing the caller.
 * @param {string} rpcServer
 * @returns {string|null}
 */
function getHost(rpcServer) {
    if (!rpcServer || typeof rpcServer !== 'string')
        return null;
    try {
        return new URL(rpcServer).host.toLowerCase();
    } catch (_) {
        return rpcServer.toLowerCase();
    }
}

function disabledKey(host) { return `${KEY_PREFIX}${host}:debug_trace:disabled`; }
function timeoutsKey(host) { return `${KEY_PREFIX}${host}:debug_trace:timeouts`; }

/**
 * Returns true if debug_traceTransaction calls to the given host should be skipped.
 * On Redis errors, returns false (fail-open) so a Redis blip never silently
 * disables tracing across the fleet.
 * @param {string} rpcServer
 * @returns {Promise<boolean>}
 */
async function isTraceDisabled(rpcServer) {
    const host = getHost(rpcServer);
    if (!host) return false;
    try {
        const value = await redis.get(disabledKey(host));
        // ioredis returns null for missing keys, but auto-mocks/stubs may
        // return undefined — treat both as "not disabled" so the predicate
        // is robust to mock implementations and never accidentally trips.
        return value != null;
    } catch (error) {
        logger.error('rpcCapabilityCache.isTraceDisabled', { error: error.message, host });
        return false;
    }
}

/**
 * Marks the host as not supporting debug_traceTransaction for UNSUPPORTED_TTL_SEC.
 * Use when the RPC explicitly returns "Method not enabled" / "does not exist".
 * @param {string} rpcServer
 * @returns {Promise<void>}
 */
async function markTraceUnsupported(rpcServer) {
    const host = getHost(rpcServer);
    if (!host) return;
    try {
        await redis.set(disabledKey(host), 'unsupported', 'EX', UNSUPPORTED_TTL_SEC);
    } catch (error) {
        logger.error('rpcCapabilityCache.markTraceUnsupported', { error: error.message, host });
    }
}

/**
 * Marks the host as too slow to trace for SLOW_TTL_SEC. Use when consecutive
 * timeouts have exceeded the threshold — shorter TTL than unsupported because
 * slowness is more often transient.
 * @param {string} rpcServer
 * @returns {Promise<void>}
 */
async function markTraceSlow(rpcServer) {
    const host = getHost(rpcServer);
    if (!host) return;
    try {
        await redis.set(disabledKey(host), 'slow', 'EX', SLOW_TTL_SEC);
        await redis.del(timeoutsKey(host));
    } catch (error) {
        logger.error('rpcCapabilityCache.markTraceSlow', { error: error.message, host });
    }
}

/**
 * Records a timeout against the host. Once TIMEOUT_THRESHOLD timeouts occur
 * within TIMEOUT_WINDOW_SEC, the host is marked slow. The counter resets on
 * any successful trace via {@link recordTraceSuccess}.
 * @param {string} rpcServer
 * @returns {Promise<void>}
 */
async function recordTraceTimeout(rpcServer) {
    const host = getHost(rpcServer);
    if (!host) return;
    try {
        const count = await redis.incr(timeoutsKey(host));
        // Refresh the window TTL on every timeout. Doing it only when count===1
        // races with a concurrent recordTraceSuccess: if it DELs the key between
        // our INCR and EXPIRE, the new key created by INCR would have no TTL
        // and accumulate forever. Refreshing unconditionally is cheap and safe.
        await redis.expire(timeoutsKey(host), TIMEOUT_WINDOW_SEC);
        if (count >= TIMEOUT_THRESHOLD)
            await markTraceSlow(rpcServer);
    } catch (error) {
        logger.error('rpcCapabilityCache.recordTraceTimeout', { error: error.message, host });
    }
}

/**
 * Resets the consecutive-timeout counter for the host. Call after any
 * successful trace so transient blips don't accumulate into a slow-mark.
 * @param {string} rpcServer
 * @returns {Promise<void>}
 */
async function recordTraceSuccess(rpcServer) {
    const host = getHost(rpcServer);
    if (!host) return;
    try {
        await redis.del(timeoutsKey(host));
    } catch (error) {
        logger.error('rpcCapabilityCache.recordTraceSuccess', { error: error.message, host });
    }
}

module.exports = {
    isTraceDisabled,
    markTraceUnsupported,
    markTraceSlow,
    recordTraceTimeout,
    recordTraceSuccess,
    _internals: { getHost, disabledKey, timeoutsKey, UNSUPPORTED_TTL_SEC, SLOW_TTL_SEC, TIMEOUT_WINDOW_SEC, TIMEOUT_THRESHOLD },
};
