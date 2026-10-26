/**
 * @fileoverview Resolves the public explorer a request is addressed to, from the
 * host it was sent to (custom domain or `<slug>.<APP_DOMAIN>`) or from an `apikey`
 * (slug) parameter. Used by the public read API fallback, the Etherscan-compatible
 * endpoints and the OpenAPI document.
 *
 * Resolution results are cached in Redis for a short time, but a cached result
 * never carries an authorization decision: consumers that serve data must always
 * call `loadPublicWorkspace` to re-check that the workspace is still public.
 * @module lib/publicExplorer
 */

const { getAppDomain } = require('./env');
const { isSelfHosted } = require('./flags');
const db = require('./firebase');
const redis = require('./redis');
const logger = require('./logger');
const { withTimeout } = require('./utils');

const CACHE_TTL_SECONDS = 60;
// The shared Redis client queues commands indefinitely during an outage; cap each
// cache operation so the database fallback stays reachable.
const CACHE_TIMEOUT_MS = 500;
const MAX_HOST_LENGTH = 253;
const HOST_REGEX = /^[a-z0-9.-]+$/;
const APIKEY_REGEX = /^[a-z0-9-]{1,64}$/;

/**
 * Normalises the host a request was addressed to.
 * Uses `x-forwarded-host` first, then `host`. Takes the first entry of a
 * comma-separated list, trims, lowercases, strips the port and one trailing dot.
 * @param {Object} req - Express request
 * @returns {string|null} The normalised host, or null if empty, too long or containing invalid characters
 */
const normaliseHost = (req) => {
    const headers = (req && req.headers) || {};
    let host = headers['x-forwarded-host'] || headers['host'];

    if (Array.isArray(host))
        host = host[0];
    if (typeof host !== 'string')
        return null;

    host = host.split(',')[0].trim().toLowerCase();
    host = host.replace(/:\d+$/, '');
    if (host.endsWith('.'))
        host = host.slice(0, -1);

    if (!host || host.length > MAX_HOST_LENGTH || !HOST_REGEX.test(host))
        return null;

    return host;
};

/**
 * Builds the resolver result from an explorer, or null if the explorer is not publicly served.
 * An explorer is accepted only if it has a subscription and a public workspace.
 * @param {Object|null} explorer - Explorer as returned by getPublicExplorerParamsBySlug/ByDomain
 * @returns {Object|null} Resolver result without `via`, or null
 */
const toResolved = (explorer) => {
    if (!explorer || !explorer.stripeSubscription || !explorer.workspace || explorer.workspace.public !== true)
        return null;
    if (!explorer.admin || !explorer.admin.firebaseUserId)
        return null;

    return {
        explorerId: explorer.id,
        explorerName: explorer.name,
        slug: explorer.slug,
        workspaceId: explorer.workspace.id,
        workspaceName: explorer.workspace.name,
        adminFirebaseUserId: explorer.admin.firebaseUserId
    };
};

/**
 * Reads a cached lookup result.
 * @param {string} key - Cache key
 * @returns {Promise<{ hit: boolean, value: Object|null, failed: boolean }>} hit is false on a miss or an error; failed is true on a Redis/parse error
 */
const readCache = async (key) => {
    try {
        const cached = await withTimeout(redis.get(key), CACHE_TIMEOUT_MS);
        if (typeof cached === 'string')
            return { hit: true, value: JSON.parse(cached), failed: false };
    } catch (error) {
        logger.warn('publicExplorer cache read failed', { key, error: error.message });
        return { hit: false, value: null, failed: true };
    }
    return { hit: false, value: null, failed: false };
};

/**
 * Writes a lookup result (or a negative result) to the cache. Errors are swallowed.
 * @param {string} key - Cache key
 * @param {Object|null} value - Resolver result without `via`, or null for a negative result
 * @returns {Promise<void>}
 */
const writeCache = async (key, value) => {
    try {
        await withTimeout(redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS), CACHE_TIMEOUT_MS);
    } catch (error) {
        logger.warn('publicExplorer cache write failed', { key, error: error.message });
    }
};

/**
 * Runs a cached lookup keyed by its own input.
 * @param {string} key - Cache key
 * @param {Function} loader - Async function returning the explorer (or null)
 * @returns {Promise<Object|null>} Resolver result without `via`, or null
 */
const cachedLookup = async (key, loader) => {
    const cached = await readCache(key);
    if (cached.hit)
        return cached.value;

    const resolved = toResolved(await loader());
    // Do not wait on a second Redis timeout when the read just failed
    if (!cached.failed)
        await writeCache(key, resolved);
    return resolved;
};

/**
 * Looks up a public explorer by slug (cached under `publicExplorer:slug:<slug>`).
 * @param {string} slug - Explorer slug
 * @returns {Promise<Object|null>} Resolver result without `via`, or null
 */
const lookupBySlug = (slug) => cachedLookup(`publicExplorer:slug:${slug}`, () => db.getPublicExplorerParamsBySlug(slug));

/**
 * Looks up a public explorer by custom domain (cached under `publicExplorer:domain:<host>`).
 * Keeps the `customDomain` plan capability gate of getPublicExplorerParamsByDomain.
 * @param {string} host - Normalised host
 * @returns {Promise<Object|null>} Resolver result without `via`, or null
 */
const lookupByDomain = (host) => cachedLookup(`publicExplorer:domain:${host}`, () => db.getPublicExplorerParamsByDomain(host));

/**
 * Resolves the host part of a request.
 * @param {string} host - Normalised host
 * @returns {Promise<Object|null>} Resolver result without `via`, or null
 */
const resolveHost = async (host) => {
    const appDomain = (getAppDomain() || '').toLowerCase();

    if (appDomain) {
        if (host === appDomain || host === `www.${appDomain}`)
            return null;
        if (!isSelfHosted() && host === `app.${appDomain}`)
            return null;

        const suffix = `.${appDomain}`;
        if (host.endsWith(suffix)) {
            const prefix = host.slice(0, -suffix.length);
            if (prefix && !prefix.includes('.')) {
                const bySlug = await lookupBySlug(prefix);
                if (bySlug)
                    return bySlug;
            }
        }
    }

    return lookupByDomain(host);
};

/**
 * Resolves the public explorer a request is addressed to.
 * Tries the host first (slug subdomain, then custom domain), then the `apikey` param (slug).
 * The returned object is identical on cache hit and miss.
 * @param {Object} req - Express request
 * @param {Object} [params] - Merged request parameters used to read `apikey`. Defaults to `req.body.data` overlaid with `req.query`
 * @returns {Promise<{via: 'host'|'apikey', explorerId: number, explorerName: string, slug: string, workspaceId: number, workspaceName: string, adminFirebaseUserId: string}|null>} The resolved explorer or null
 */
const resolvePublicExplorer = async (req, params) => {
    const host = normaliseHost(req);
    if (host) {
        const resolved = await resolveHost(host);
        if (resolved)
            return { via: 'host', ...resolved };
    }

    const input = params || { ...(req && req.body && req.body.data), ...(req && req.query) };
    const apikey = input.apikey;
    if (typeof apikey === 'string' && APIKEY_REGEX.test(apikey)) {
        const resolved = await lookupBySlug(apikey);
        if (resolved)
            return { via: 'apikey', ...resolved };
    }

    return null;
};

/**
 * Fresh visibility check: loads the workspace of a resolved explorer and returns it
 * only if it still exists, is the same workspace and is public right now.
 * @param {Object} resolved - Result of resolvePublicExplorer
 * @returns {Promise<Object|null>} The workspace, or null
 */
const loadPublicWorkspace = async (resolved) => {
    if (!resolved)
        return null;

    const workspace = await db.getWorkspaceByNameAuth(resolved.adminFirebaseUserId, resolved.workspaceName);
    if (!workspace || workspace.id !== resolved.workspaceId || workspace.public !== true)
        return null;

    return workspace;
};

/**
 * Resolves a public explorer for the verification endpoints' additive fallback and
 * returns the full explorer params (same shape as getPublicExplorerParamsBySlug).
 * Only used when the legacy resolution of those endpoints found nothing.
 * @param {Object} req - Express request
 * @param {Object} params - The endpoint's merged request parameters
 * @returns {Promise<Object|null>} Full explorer params, or null
 */
const resolveExplorerParamsFallback = async (req, params) => {
    const resolved = await resolvePublicExplorer(req, params);
    if (!resolved)
        return null;

    const workspace = await loadPublicWorkspace(resolved);
    if (!workspace)
        return null;

    const explorer = await db.getPublicExplorerParamsBySlug(resolved.slug);
    return explorer && explorer.id === resolved.explorerId ? explorer : null;
};

module.exports = {
    normaliseHost,
    resolvePublicExplorer,
    loadPublicWorkspace,
    resolveExplorerParamsFallback
};
