#!/usr/bin/env node
/**
 * Exits 0 (skip) if slug is already promoted OR if the dedup check itself fails.
 *
 * Fail-closed: a transient DB error (missing native binding, corrupt schema,
 * SQLITE_BUSY, etc) must not cause a re-promotion. Better to miss a legitimate
 * new article (recoverable on the next 10-minute cycle, once the underlying
 * problem is fixed) than to spam X with stale posts. See issue #1254 + the
 * 5-old-articles-re-promoted-in-one-day incident on 2026-04-26.
 *
 * Uses dynamic import so a failure resolving better-sqlite3 (which throws at
 * link time) is caught here instead of escaping as an unhandled exit-1.
 */
const slug = process.argv[2];

(async () => {
    try {
        const { getDb } = await import('../db.js');
        process.exit(getDb().isPromoted(slug) ? 0 : 1);
    } catch (err) {
        process.stderr.write(`is-promoted: dedup check failed (${err.message}); treating "${slug}" as promoted\n`);
        process.exit(0);
    }
})();
