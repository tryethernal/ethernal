/**
 * @fileoverview Configuration for the Ethernal tweet pipeline.
 * Defines content buckets, scheduling parameters, Twitter constraints, and file paths.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Content buckets defining the 5 daily tweet slots.
 * Each bucket maps to a time window and content source.
 * @type {Array<{slot: number, baseHourUTC: number, label: string, source: string}>}
 */
export const BUCKETS = [
    { slot: 1, baseHourUTC: 7,  label: 'Ecosystem news',     source: 'trend_scanner' },
    { slot: 2, baseHourUTC: 10, label: 'EIP/ERC commentary',  source: 'trend_scanner' },
    { slot: 3, baseHourUTC: 15, label: 'Product tip',         source: 'features' },
    { slot: 4, baseHourUTC: 16, label: 'Blog repurposing',    source: 'blog' },
    { slot: 5, baseHourUTC: 19, label: 'Hot take',            source: 'trend_scanner' },
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
    return new Date(scheduled.getTime() + jitterMs);
}
