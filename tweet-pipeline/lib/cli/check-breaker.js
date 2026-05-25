#!/usr/bin/env node
/**
 * @fileoverview CLI shim around the circuit-breaker module for shell scripts.
 *
 * Exit codes:
 *   0 — breaker is OPEN (caller should short-circuit / skip this run)
 *   1 — breaker is CLOSED (caller should proceed normally)
 *
 * Stdout (when open): one human-readable line with reason + expiry, e.g.
 *   "Twitter HTTP 402 CreditsDepleted: ... (expires 2026-05-25T06:15:13.000Z)"
 *
 * The unusual "0 == open" convention matches shell `if check-breaker; then skip; fi`
 * ergonomics — `gh` and friends use exit-0 for "the condition you asked about is
 * true". Same convention as is-promoted.js in this directory.
 */

import { isBreakerOpen } from '../circuit-breaker.js';

const open = isBreakerOpen();
if (open) {
    process.stdout.write(`${open.reason} (expires ${open.expiresAt})\n`);
    process.exit(0);
}

process.exit(1);
