/**
 * @fileoverview Configuration for the Ethernal tweet pipeline.
 * Defines content buckets, scheduling parameters, Twitter constraints, and file paths.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Content buckets defining the 2 daily tweet slots.
 * Reduced from 5 to avoid diluting reach on a 225-follower account.
 * Slot 1: morning ecosystem/take (high reach). Slot 2: afternoon product/blog (engagement).
 * @type {Array<{slot: number, baseHourUTC: number, label: string, source: string}>}
 */
export const BUCKETS = [
    { slot: 1, baseHourUTC: 8,  label: 'Ecosystem insight',   source: 'trend_scanner' },
    { slot: 2, baseHourUTC: 15, label: 'Product / blog',      source: 'mixed' },
];

/**
 * Scheduling parameters for tweet publishing.
 * @type {{jitterMinutes: number, publishIntervalMinutes: number}}
 */
export const SCHEDULE = {
    /** Maximum random offset (+-) applied to baseHourUTC */
    jitterMinutes: 30,
    /** Minimum gap between consecutive tweet publishes */
    publishIntervalMinutes: 10,
};

/**
 * Twitter API and content constraints.
 * @type {{maxTweetLength: number, maxThreadReplies: number}}
 */
export const TWITTER = {
    /** Maximum characters per tweet */
    maxTweetLength: 280,
    /** Maximum number of replies in a thread (excluding the root tweet) */
    maxThreadReplies: 4,
};

/**
 * File system paths used by the pipeline.
 * @type {{queueDir: string, logDir: string, templateDir: string}}
 */
export const PATHS = {
    queueDir: join(__dirname, 'queue'),
    logDir: join(__dirname, 'logs'),
    templateDir: join(__dirname, 'templates'),
};

/**
 * Calculates a scheduled publish time by adding random jitter to a base hour.
 * The jitter is uniformly distributed within +-SCHEDULE.jitterMinutes.
 * @param {Date} date - The date to schedule on (time portion is ignored).
 * @param {number} baseHourUTC - The base hour in UTC (0-23).
 * @returns {Date} A new Date with the base hour plus random jitter applied.
 */
export function getScheduledTime(date, baseHourUTC) {
    const scheduled = new Date(date);
    scheduled.setUTCHours(baseHourUTC, 0, 0, 0);
    const jitterMs = (Math.random() * 2 - 1) * SCHEDULE.jitterMinutes * 60 * 1000;
    const result = new Date(scheduled.getTime() + jitterMs);

    // If the scheduled time is in the past (draft ran late), push to at least 20 min from now
    const minDelay = new Date(Date.now() + 20 * 60 * 1000);
    if (result < minDelay) return minDelay;

    return result;
}
