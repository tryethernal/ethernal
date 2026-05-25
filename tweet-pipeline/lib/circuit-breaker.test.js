/**
 * @fileoverview Tests for the persistent circuit breaker.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    tripBreaker,
    isBreakerOpen,
    resetBreaker,
    classifyTwitterError,
} from './circuit-breaker.js';

let workDir;

beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cb-test-'));
    process.env.TWEET_PIPELINE_BREAKER_PATH = join(workDir, 'breaker.json');
});

afterEach(() => {
    delete process.env.TWEET_PIPELINE_BREAKER_PATH;
    rmSync(workDir, { recursive: true, force: true });
});

describe('circuit-breaker', () => {
    describe('isBreakerOpen', () => {
        it('returns null when no marker file exists', () => {
            assert.equal(isBreakerOpen(), null);
        });

        it('returns the payload when the breaker is tripped and not expired', () => {
            tripBreaker('test reason');
            const open = isBreakerOpen();
            assert.ok(open, 'expected breaker to be open');
            assert.equal(open.reason, 'test reason');
            assert.ok(open.trippedAt);
            assert.ok(open.expiresAt);
        });

        it('treats an expired breaker as closed and removes the marker', () => {
            tripBreaker('old', 1); // 1ms TTL
            // Wait past expiry — node:test guarantees microtask order but use sleep
            // via a deterministic synchronous loop on Date.now to avoid timer flakiness.
            const deadline = Date.now() + 10;
            while (Date.now() <= deadline) { /* spin briefly */ }
            assert.equal(isBreakerOpen(), null);
            assert.equal(existsSync(process.env.TWEET_PIPELINE_BREAKER_PATH), false);
        });

        it('treats a corrupt marker as closed and removes it', async () => {
            const { writeFileSync } = await import('node:fs');
            writeFileSync(process.env.TWEET_PIPELINE_BREAKER_PATH, '{not json');
            assert.equal(isBreakerOpen(), null);
            assert.equal(existsSync(process.env.TWEET_PIPELINE_BREAKER_PATH), false);
        });
    });

    describe('tripBreaker', () => {
        it('writes a marker that survives between calls', () => {
            tripBreaker('first');
            const first = isBreakerOpen();
            assert.equal(first.reason, 'first');
        });

        it('overwrites the marker on each trip with a fresher expiry', async () => {
            tripBreaker('first', 1000);
            const a = isBreakerOpen();
            // Ensure the wall clock advances at least 2ms so timestamps differ
            // even on fast machines where Date.now() resolution may coalesce
            // back-to-back trips into the same millisecond.
            await new Promise(r => setTimeout(r, 5));
            tripBreaker('second', 1000);
            const b = isBreakerOpen();
            assert.equal(b.reason, 'second');
            assert.ok(
                Date.parse(b.expiresAt) > Date.parse(a.expiresAt),
                `expected new expiry (${b.expiresAt}) to be after old (${a.expiresAt})`,
            );
        });

        it('creates the parent directory if missing', () => {
            const nested = join(workDir, 'nested', 'deeper', 'breaker.json');
            process.env.TWEET_PIPELINE_BREAKER_PATH = nested;
            tripBreaker('nested');
            assert.ok(existsSync(nested));
        });
    });

    describe('resetBreaker', () => {
        it('removes an existing marker and returns true', () => {
            tripBreaker('reason');
            assert.equal(resetBreaker(), true);
            assert.equal(isBreakerOpen(), null);
        });

        it('returns false when no marker exists', () => {
            assert.equal(resetBreaker(), false);
        });
    });

    describe('classifyTwitterError', () => {
        it('returns a reason for HTTP 402 errors', () => {
            const err = {
                code: 402,
                data: { title: 'CreditsDepleted', detail: 'Account has no credits.' },
            };
            const verdict = classifyTwitterError(err);
            assert.ok(verdict, 'expected a non-null verdict');
            assert.match(verdict.reason, /CreditsDepleted/);
            assert.match(verdict.reason, /Account has no credits/);
        });

        it('returns a reason when title is CreditsDepleted even without code 402', () => {
            const err = { data: { title: 'CreditsDepleted', detail: 'd' } };
            assert.ok(classifyTwitterError(err));
        });

        it('returns null for transient errors (5xx)', () => {
            const err = { code: 503, data: { title: 'ServiceUnavailable' } };
            assert.equal(classifyTwitterError(err), null);
        });

        it('returns null for rate limits (429)', () => {
            const err = { code: 429, data: { title: 'TooManyRequests' } };
            assert.equal(classifyTwitterError(err), null);
        });

        it('returns null for null / non-object inputs', () => {
            assert.equal(classifyTwitterError(null), null);
            assert.equal(classifyTwitterError(undefined), null);
            assert.equal(classifyTwitterError('error string'), null);
            assert.equal(classifyTwitterError(42), null);
        });

        it('falls back to a generic detail when data.detail is missing', () => {
            const err = { code: 402, data: { title: 'CreditsDepleted' } };
            const verdict = classifyTwitterError(err);
            assert.match(verdict.reason, /credits exhausted/i);
        });
    });
});
