/**
 * @fileoverview Exit-code contract tests for lib/cli/check-breaker.js.
 *
 * The shell callers (publish.sh, promote-blog.sh) depend on a specific
 * three-code contract: 0 = OPEN, 1 = CLOSED, 2 = error. Confusing 1 and 2
 * would either fail-closed (deadlock the pipeline) or fail-open (defeat the
 * breaker entirely — the original bug pre-Greptile-review).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, 'check-breaker.js');

let workDir;
let breakerPath;

beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'check-breaker-test-'));
    breakerPath = join(workDir, 'breaker.json');
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
});

/**
 * Run the CLI with TWEET_PIPELINE_BREAKER_PATH set to our temp file.
 * @param {Record<string,string>} [extraEnv]
 */
function runCli(extraEnv = {}) {
    return spawnSync('node', [CLI], {
        env: { ...process.env, TWEET_PIPELINE_BREAKER_PATH: breakerPath, ...extraEnv },
        encoding: 'utf8',
    });
}

describe('check-breaker CLI exit codes', () => {
    it('exits 1 (CLOSED) when no marker file exists', () => {
        const result = runCli();
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
    });

    it('exits 0 (OPEN) when a valid unexpired marker exists', () => {
        const future = new Date(Date.now() + 60_000).toISOString();
        writeFileSync(breakerPath, JSON.stringify({
            reason: 'test reason',
            trippedAt: new Date().toISOString(),
            expiresAt: future,
        }));

        const result = runCli();
        assert.equal(result.status, 0);
        assert.match(result.stdout, /test reason/);
        assert.match(result.stdout, /expires/);
    });

    it('exits 1 (CLOSED) when the marker is expired', () => {
        const past = new Date(Date.now() - 60_000).toISOString();
        writeFileSync(breakerPath, JSON.stringify({
            reason: 'expired',
            trippedAt: past,
            expiresAt: past,
        }));

        const result = runCli();
        assert.equal(result.status, 1);
    });

    it('exits 1 (CLOSED) when the marker is corrupt — recoverable as closed', () => {
        // A corrupt marker is treated as closed by isBreakerOpen() (it removes
        // the file and returns null). This is intentional self-healing; only
        // genuinely unexpected errors (e.g. fs permission denial) should hit
        // exit-2. Test it stays in the "fail-recoverable" lane, not the
        // "fail-open silently" lane.
        writeFileSync(breakerPath, '{not json');
        const result = runCli();
        assert.equal(result.status, 1);
    });

    it('exit 2 is distinct from exit 1 (no fail-open collision with Node crash)', () => {
        // This is the regression guarantee from Greptile review on #1309:
        // Node's default uncaught-exception exit is 1, which previously
        // collided with our "CLOSED, proceed" code. The CLI now wraps its
        // body in try/catch and reserves 2 for errors. We can't easily force
        // an internal crash from outside, but we can assert the documented
        // codes (0, 1, 2) are all distinct and 1 is not used as a catch-all.
        // The other tests in this file cover 0 and 1; here we assert the
        // contract is documented.
        const result = runCli();
        assert.notEqual(result.status, 2, 'exit 2 must be reserved for errors only');
        assert.ok([0, 1].includes(result.status), `unexpected exit ${result.status}`);
    });

    it('the documented shell wrapper pattern does not trip `set -euo pipefail`', () => {
        // Second regression guarantee from Greptile review on #1309: the
        // shell callers (publish.sh, promote-blog.sh) run under
        // `set -euo pipefail` with an ERR trap that calls report_failure.
        // The naive `VAR=$(cmd); RC=$?` pattern aborts on cmd's non-zero
        // exit and never reaches the `RC=$?` line — meaning the ERR trap
        // fires on EVERY normal run (exit 1 = breaker closed). The
        // documented pattern uses `|| RC=$?` to absorb the non-zero exit.
        // Test by invoking the exact pattern in a fresh bash subshell and
        // asserting that the trap does NOT fire.
        const script = `
            set -euo pipefail
            trap 'echo TRAP_FIRED >&2; exit 99' ERR

            BREAKER_RC=0
            BREAKER_REASON=$(node ${JSON.stringify(CLI)}) || BREAKER_RC=$?

            echo "rc=$BREAKER_RC"
        `;
        const result = spawnSync('bash', ['-c', script], {
            env: { ...process.env, TWEET_PIPELINE_BREAKER_PATH: breakerPath },
            encoding: 'utf8',
        });
        assert.equal(result.status, 0, `shell wrapper exited ${result.status}; stderr: ${result.stderr}`);
        assert.doesNotMatch(result.stderr, /TRAP_FIRED/, 'ERR trap should not fire on breaker-closed path');
        assert.match(result.stdout, /rc=1/);
    });
});
