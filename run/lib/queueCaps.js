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

/**
 * Evaluates the tier of a workspace by reading from the database.
 * Always returns 'normal' on lookup failure (fail open).
 *
 * @param {number} workspaceId
 * @returns {Promise<'low'|'normal'>}
 */
const evaluateTier = async (workspaceId) => {
    // Lazy-require models to avoid a load-time cycle: queueCaps is reached via
    // models/block.js → lib/queue → lib/queueCaps, and a top-level require here
    // would resolve to the partially-initialized models object.
    const { Workspace } = require('../models');
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
        const NON_PAYING_STATUSES = ['trial', 'canceled', 'past_due', 'unpaid', 'incomplete_expired'];
        if (NON_PAYING_STATUSES.includes(ws.explorer.stripeSubscription.status)) return 'low';
        const LOW_TIER_PLAN_SLUGS = ['free', 'demo'];
        if (LOW_TIER_PLAN_SLUGS.includes(ws.explorer.stripeSubscription.stripePlan?.slug)) return 'low';
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
    if (!workspaceId) return false;
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

const DROP_LOG_PREFIX = 'queueCap:dropLog:';

/**
 * Rate-limit drop logs to once per workspace per queue per hour.
 * Returns true if the caller should log this drop.
 *
 * On Redis failure, returns true (log) — favours visibility.
 *
 * @param {string} queueName
 * @param {number} workspaceId
 * @returns {Promise<boolean>}
 */
const shouldLogDrop = async (queueName, workspaceId) => {
    const key = `${DROP_LOG_PREFIX}${queueName}:${workspaceId}`;
    try {
        const set = await redis.set(key, '1', 'NX', 'EX', 3600);
        return set === 'OK';
    } catch (error) {
        logger.warn('shouldLogDrop redis set failed', { queueName, workspaceId, error: error.message });
        return true;
    }
};

/**
 * Lua script: group jobs in :wait + :prioritized by workspaceId (parsed from job name)
 * and return a flat array [wsId, count, wsId, count, ...] for the caller to reduce.
 *
 * KEYS[1] = bull:<queue>:wait
 * KEYS[2] = bull:<queue>:prioritized
 * ARGV[1] = queue prefix (e.g. 'blockSync-' or 'receiptSync-')
 */
const SCAN_BY_WORKSPACE_LUA = `
local prefix = ARGV[1]
local prefixLen = #prefix
local counts = {}

local function record(name)
    if string.sub(name, 1, prefixLen) ~= prefix then return end
    local rest = string.sub(name, prefixLen + 1)
    local wsEnd = string.find(rest, '-', 1, true)
    if not wsEnd then return end
    local ws = string.sub(rest, 1, wsEnd - 1)
    if not string.match(ws, '^%d+$') then return end
    counts[ws] = (counts[ws] or 0) + 1
end

local wait = redis.call('LRANGE', KEYS[1], 0, -1)
for i = 1, #wait do record(wait[i]) end
local prio = redis.call('ZRANGE', KEYS[2], 0, -1)
for i = 1, #prio do record(prio[i]) end

local out = {}
for ws, c in pairs(counts) do
    table.insert(out, ws)
    table.insert(out, tostring(c))
end
return out
`;

/**
 * Scans :wait + :prioritized for the given queue and returns a Map<workspaceId, count>.
 * Returns an empty Map on Redis error.
 *
 * @param {string} queueName
 * @returns {Promise<Map<number, number>>}
 */
const scanQueueByWorkspace = async (queueName) => {
    try {
        const flat = await redis.eval(
            SCAN_BY_WORKSPACE_LUA,
            2,
            `bull:${queueName}:wait`,
            `bull:${queueName}:prioritized`,
            `${queueName}-`
        );
        const map = new Map();
        if (Array.isArray(flat)) {
            for (let i = 0; i < flat.length; i += 2) {
                map.set(parseInt(flat[i], 10), parseInt(flat[i + 1], 10));
            }
        }
        return map;
    } catch (error) {
        logger.warn('scanQueueByWorkspace failed', { queueName, error: error.message });
        return new Map();
    }
};

/**
 * Lua script: remove the oldest N jobs for a workspace from :wait then :prioritized.
 * Rebuilds the wait list in one O(N) pass to avoid O(N×K) from per-job LREM.
 * For the prioritized zset, uses ZREM (O(log N) per call).
 * Deletes the job hash for each removed job. Returns count actually removed.
 *
 * KEYS[1] = bull:<queue>:wait
 * KEYS[2] = bull:<queue>:prioritized
 * ARGV[1] = job-name prefix (e.g. 'blockSync-17061-')
 * ARGV[2] = excess count to remove (string)
 * ARGV[3] = job-hash prefix (e.g. 'bull:blockSync:')
 */
const TRIM_OLDEST_LUA = `
local prefix = ARGV[1]
local excess = tonumber(ARGV[2])
local hashPrefix = ARGV[3]
local removed = 0
local removedJobs = {}

if excess <= 0 then return 0 end

-- Wait list: rebuild in one pass instead of LREM per job (O(N) vs O(N*K))
local wait = redis.call('LRANGE', KEYS[1], 0, -1)
local keep = {}
for i = 1, #wait do
    if removed < excess and string.sub(wait[i], 1, #prefix) == prefix then
        table.insert(removedJobs, wait[i])
        removed = removed + 1
    else
        table.insert(keep, wait[i])
    end
end

-- Only rewrite if we actually removed something
if #removedJobs > 0 then
    redis.call('DEL', KEYS[1])
    -- RPUSH preserves order. Chunk to keep unpack() under Lua 5.1's stack
    -- limit (~8000 args), so we never crash even on large kept lists.
    local CHUNK = 1000
    for i = 1, #keep, CHUNK do
        local chunk = {}
        for j = i, math.min(i + CHUNK - 1, #keep) do
            table.insert(chunk, keep[j])
        end
        redis.call('RPUSH', KEYS[1], unpack(chunk))
    end
end

-- Prioritized zset: ZREM is O(log N), safe to call per-job
if removed < excess then
    local prio = redis.call('ZRANGE', KEYS[2], 0, -1)
    for i = 1, #prio do
        if removed >= excess then break end
        if string.sub(prio[i], 1, #prefix) == prefix then
            redis.call('ZREM', KEYS[2], prio[i])
            table.insert(removedJobs, prio[i])
            removed = removed + 1
        end
    end
end

-- Delete job hashes
for i = 1, #removedJobs do
    redis.call('DEL', hashPrefix .. removedJobs[i])
end

return removed
`;

/**
 * Atomically removes the oldest `excess` jobs for a workspace from :wait + :prioritized,
 * then deletes their hashes. Returns the count actually removed.
 * Returns 0 on Redis error.
 *
 * @param {string} queueName
 * @param {number} workspaceId
 * @param {number} excess
 * @returns {Promise<number>}
 */
const trimOldest = async (queueName, workspaceId, excess) => {
    if (excess <= 0) return 0;
    try {
        const result = await redis.eval(
            TRIM_OLDEST_LUA,
            2,
            `bull:${queueName}:wait`,
            `bull:${queueName}:prioritized`,
            `${queueName}-${workspaceId}-`,
            String(excess),
            `bull:${queueName}:`
        );
        return Number(result) || 0;
    } catch (error) {
        logger.warn('trimOldest failed', { queueName, workspaceId, excess, error: error.message });
        return 0;
    }
};

module.exports = {
    getCap,
    parseWorkspaceFromJobName,
    evaluateTier,
    isLowTierWorkspace,
    countWaitingForWorkspace,
    shouldLogDrop,
    scanQueueByWorkspace,
    trimOldest,
};
