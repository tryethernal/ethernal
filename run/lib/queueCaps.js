/**
 * @fileoverview Per-workspace queue cap utilities.
 * Identifies low-tier workspaces, returns per-queue caps, and exposes
 * Redis-side helpers for counting and trimming waiting jobs by workspace.
 *
 * Two consumers:
 *  - run/lib/queue.js — synchronous cap check inside enqueue/bulkEnqueue.
 *  - run/jobs/queueMonitoring.js — periodic sweep that trims direct-Redis writes from cli-light.
 *
 * @module lib/queueCaps
 */

const env = require('./env');

/**
 * Returns the per-queue waiting-job cap for a low-tier workspace.
 * @param {string} queueName
 * @returns {number} Cap, or Infinity if the queue is not capped.
 */
const getCap = (queueName) => {
    if (queueName === 'blockSync') return env.queueCapBlockSync();
    if (queueName === 'receiptSync') return env.queueCapReceiptSync();
    return Infinity;
};

/**
 * Extracts numeric workspaceId from a BullMQ job name like 'blockSync-15537-...'.
 * Returns null for batch jobs (whose names embed userId/workspace-name not workspaceId)
 * or for any unsupported queue/format.
 *
 * @param {string} queueName
 * @param {string|null} jobName
 * @returns {number|null}
 */
const parseWorkspaceFromJobName = (queueName, jobName) => {
    if (!jobName || (queueName !== 'blockSync' && queueName !== 'receiptSync')) return null;
    const match = jobName.match(/^(?:blockSync|receiptSync)-(\d+)-/);
    if (!match) return null;
    return parseInt(match[1], 10);
};

const logger = require('./logger');
const { Workspace } = require('../models');

/**
 * Evaluates the tier of a workspace by reading from the database.
 * Always returns 'normal' on lookup failure (fail open).
 *
 * @param {number} workspaceId
 * @returns {Promise<'low'|'normal'>}
 */
const evaluateTier = async (workspaceId) => {
    try {
        const ws = await Workspace.findByPk(workspaceId, {
            attributes: ['id'],
            include: [{
                association: 'explorer',
                attributes: ['id', 'isDemo'],
                include: [{
                    association: 'stripeSubscription',
                    attributes: ['id', 'status'],
                    include: [{
                        association: 'stripePlan',
                        attributes: ['id', 'slug']
                    }]
                }]
            }]
        });

        if (!ws) return 'normal';
        if (!ws.explorer) return 'low';
        if (ws.explorer.isDemo) return 'low';
        if (!ws.explorer.stripeSubscription) return 'low';
        if (ws.explorer.stripeSubscription.status === 'trial') return 'low';
        if (ws.explorer.stripeSubscription.stripePlan?.slug === 'free') return 'low';
        return 'normal';
    } catch (error) {
        logger.warn('evaluateTier failed, treating as normal-tier', { workspaceId, error: error.message });
        return 'normal';
    }
};

const redis = require('./redis');

const TIER_CACHE_PREFIX = 'queueCap:tier:';

/**
 * Returns whether a workspace is low-tier, cached for 60s in Redis.
 * Fail-open: returns false (not low-tier) on any Redis or DB error.
 *
 * @param {number|null|undefined} workspaceId
 * @returns {Promise<boolean>}
 */
const isLowTierWorkspace = async (workspaceId) => {
    if (workspaceId === null || workspaceId === undefined) return false;
    const cacheKey = `${TIER_CACHE_PREFIX}${workspaceId}`;
    let cached;
    try {
        cached = await redis.get(cacheKey);
    } catch (error) {
        logger.warn('queueCap tier cache get failed', { workspaceId, error: error.message });
        return false;
    }
    if (cached === 'low') return true;
    if (cached === 'normal') return false;

    const tier = await evaluateTier(workspaceId);
    try {
        await redis.set(cacheKey, tier, 'EX', env.queueCapTierCacheTtlSeconds());
    } catch (error) {
        logger.warn('queueCap tier cache set failed', { workspaceId, error: error.message });
    }
    return tier === 'low';
};

/**
 * Lua script: count waiting jobs in a queue's :wait list and :prioritized zset
 * whose names start with the given prefix. Returns the sum.
 *
 * KEYS[1] = bull:<queue>:wait
 * KEYS[2] = bull:<queue>:prioritized
 * ARGV[1] = name prefix to match (e.g. 'blockSync-17061-')
 */
const COUNT_WAITING_LUA = `
local prefix = ARGV[1]
local count = 0
local wait = redis.call('LRANGE', KEYS[1], 0, -1)
for i = 1, #wait do
    if string.sub(wait[i], 1, #prefix) == prefix then count = count + 1 end
end
local prio = redis.call('ZRANGE', KEYS[2], 0, -1)
for i = 1, #prio do
    if string.sub(prio[i], 1, #prefix) == prefix then count = count + 1 end
end
return count
`;

/**
 * Counts waiting jobs in :wait + :prioritized for a single workspace.
 * Returns 0 on any Redis error (fail open).
 *
 * @param {string} queueName
 * @param {number} workspaceId
 * @returns {Promise<number>}
 */
const countWaitingForWorkspace = async (queueName, workspaceId) => {
    try {
        const result = await redis.eval(
            COUNT_WAITING_LUA,
            2,
            `bull:${queueName}:wait`,
            `bull:${queueName}:prioritized`,
            `${queueName}-${workspaceId}-`
        );
        return Number(result) || 0;
    } catch (error) {
        logger.warn('countWaitingForWorkspace failed', { queueName, workspaceId, error: error.message });
        return 0;
    }
};

module.exports = { getCap, parseWorkspaceFromJobName, evaluateTier, isLowTierWorkspace, countWaitingForWorkspace };
