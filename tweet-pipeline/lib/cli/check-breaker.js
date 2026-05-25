#!/usr/bin/env node
/**
 * @fileoverview CLI shim around the circuit-breaker module for shell scripts.
 *
 * Exit codes:
 *   0 — breaker is OPEN (caller should short-circuit / skip this run)
 *   1 — breaker is CLOSED (caller should proceed normally)
 *   2 — unexpected error reading the breaker (treat as CLOSED but log)
 *
 * Exit 2 is critical: Node's default crash exit is 1, which would collide
 * with "breaker is closed" and silently fail-open the entire system if
 * shell callers use `2>/dev/null`. We reserve 1 for "definitively closed"
 * and 2 for "couldn't tell — assume closed but the caller should at least
 * surface the stderr output before proceeding". This way `set -e` shell
 * callers can distinguish.
 *
 * Stdout (when open): one human-readable line with reason + expiry, e.g.
 *   "Twitter HTTP 402 CreditsDepleted: ... (expires 2026-05-25T06:15:13.000Z)"
 *
 * The unusual "0 == open" convention matches shell `if check-breaker; then skip; fi`
 * ergonomics — `gh` and friends use exit-0 for "the condition you asked about is
 * true". Same convention as is-promoted.js in this directory.
 */

try {
    const { isBreakerOpen } = await import('../circuit-breaker.js');
    const open = isBreakerOpen();
    if (open) {
        process.stdout.write(`${open.reason} (expires ${open.expiresAt})\n`);
        process.exit(0);
    }
    process.exit(1);
} catch (err) {
    process.stderr.write(`check-breaker: failed to read breaker state (${err.message})\n`);
    process.exit(2);
}
