/**
 * @fileoverview Persistent circuit breaker for fail-stop conditions in the
 * tweet pipeline. When a non-recoverable error is detected (e.g. Twitter
 * returns HTTP 402 CreditsDepleted), we write a marker file with a TTL so
 * subsequent timer fires bail out fast instead of generating a fresh
 * GitHub issue every 10 minutes.
 *
 * Used by tweet-pipeline/lib/twitter.js (to trip the breaker on 402) and
 * tweet-pipeline/publish.sh + promote-blog.sh (to check the breaker at
 * the start of each run).
 *
 * Design notes:
 * - File-based, no daemon — survives process restarts and is shared
 *   across publish.sh, promote-blog.sh and the underlying node helpers.
 * - JSON payload so we can store reason + tripped-at + TTL.
 * - TTL is 6h by default; auto-recovers once Twitter credits are topped
 *   up (the next scheduled run after expiry will retry and either succeed
 *   or re-trip the breaker for another 6h).
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** Default marker location. Overridden by TWEET_PIPELINE_BREAKER_PATH env. */
const DEFAULT_PATH = '/var/lib/tweet-pipeline/circuit-breaker.json';

/** Default TTL: 6 hours. After this, the next run will retry the API. */
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Resolves the breaker marker file path from env or default.
 * @returns {string}
 */
function breakerPath() {
    return process.env.TWEET_PIPELINE_BREAKER_PATH || DEFAULT_PATH;
}

/**
 * Trips the circuit breaker, writing a marker file with the supplied reason.
 * Subsequent calls to {@link isBreakerOpen} will return true until the TTL
 * expires or {@link resetBreaker} is called.
 *
 * Safe to call repeatedly — overwrites the marker each time so the TTL
 * window slides forward on every fresh failure.
 *
 * @param {string} reason - Human-readable explanation, e.g.
 *   "Twitter HTTP 402 CreditsDepleted".
 * @param {number} [ttlMs=DEFAULT_TTL_MS] - How long the breaker stays open.
 * @returns {{path: string, reason: string, trippedAt: string, expiresAt: string}}
 */
export function tripBreaker(reason, ttlMs = DEFAULT_TTL_MS) {
    const path = breakerPath();
    const now = Date.now();
    const payload = {
        reason,
        trippedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlMs).toISOString(),
    };

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(payload, null, 2));
    return { path, ...payload };
}

/**
 * Checks whether the breaker is currently open (tripped and not expired).
 * A breaker file with an `expiresAt` in the past is treated as closed
 * and silently removed so the caller doesn't have to.
 *
 * @returns {null | {reason: string, trippedAt: string, expiresAt: string}}
 *   null if breaker is closed; otherwise the payload of the open breaker.
 */
export function isBreakerOpen() {
    const path = breakerPath();
    if (!existsSync(path)) return null;

    let payload;
    try {
        payload = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        // Corrupt marker — treat as closed and clear it.
        try { unlinkSync(path); } catch { /* ignore */ }
        return null;
    }

    if (!payload || !payload.expiresAt) return null;
    if (Date.parse(payload.expiresAt) <= Date.now()) {
        try { unlinkSync(path); } catch { /* ignore */ }
        return null;
    }

    return payload;
}

/**
 * Resets the breaker (removes the marker file). Called on successful API
 * calls so a brief outage doesn't leave the breaker open for its full TTL.
 * No-op if the marker doesn't exist.
 *
 * @returns {boolean} true if a marker was removed, false if none existed.
 */
export function resetBreaker() {
    const path = breakerPath();
    if (!existsSync(path)) return false;
    try {
        unlinkSync(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Inspects a thrown error from twitter-api-v2 and decides whether it is a
 * non-recoverable, account-level failure that should trip the breaker.
 *
 * Currently matches:
 * - HTTP 402 CreditsDepleted (Twitter pay-per-use credits exhausted).
 *
 * Does NOT trip on transient errors (5xx, rate limits, network timeouts) —
 * those should retry on the next scheduled run.
 *
 * @param {unknown} err - The error thrown by a twitter-api-v2 call.
 * @returns {null | {reason: string}} A reason string if the breaker should
 *   trip; null otherwise.
 */
export function classifyTwitterError(err) {
    if (!err || typeof err !== 'object') return null;

    const code = err.code;
    const title = err.data && err.data.title;

    if (code === 402 || title === 'CreditsDepleted') {
        const detail = (err.data && err.data.detail) || 'Twitter account credits exhausted';
        return { reason: `Twitter HTTP 402 CreditsDepleted: ${detail}` };
    }

    return null;
}
