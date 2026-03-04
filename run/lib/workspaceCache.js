/**
 * @fileoverview In-memory LRU cache for Workspace data.
 * Reduces DB load from hot-path jobs (blockSync, receiptSync, processContract, etc.)
 * that repeatedly load the same workspace with identical includes.
 *
 * @module lib/workspaceCache
 */

const LRUCache = require('lru-cache');

const cache = new LRUCache({
    max: 500,
    ttl: 30000 // 30 seconds
});

/**
 * Gets a workspace by ID with caching. Falls back to DB on cache miss.
 * Cache key includes a hash of the include config to avoid serving stale includes.
 *
 * @param {number} workspaceId - Workspace primary key
 * @param {Function} fetcher - Async function that fetches workspace from DB (called on cache miss)
 * @param {string} [cacheKey] - Optional cache key suffix for different include configurations
 * @returns {Promise<Object>} Workspace instance
 */
async function getCachedWorkspace(workspaceId, fetcher, cacheKey = 'default') {
    const key = `${workspaceId}:${cacheKey}`;
    let workspace = cache.get(key);

    if (!workspace) {
        workspace = await fetcher();
        if (workspace)
            cache.set(key, workspace);
    }

    return workspace;
}

/**
 * Invalidates cached workspace data.
 *
 * @param {number} workspaceId - Workspace ID to invalidate
 */
function invalidateWorkspace(workspaceId) {
    // Delete all cache keys for this workspace
    for (const key of cache.keys()) {
        if (key.startsWith(`${workspaceId}:`))
            cache.delete(key);
    }
}

module.exports = { getCachedWorkspace, invalidateWorkspace };
