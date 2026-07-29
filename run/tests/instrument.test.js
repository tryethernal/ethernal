/**
 * @fileoverview Tests for the Sentry trace sampler.
 *
 * These rates are a quota guard, not a preference: the org ingests against a
 * fixed monthly span allowance with no on-demand spend, so a regression here
 * means production goes blind partway through the billing period. The exact
 * numbers are asserted deliberately.
 */

jest.mock('../lib/logger', () => ({ info: jest.fn() }));

const { tracesSampler } = require('../instrument');

const sample = (name, { attributes = {}, parentSampled } = {}) =>
    tracesSampler({ name, attributes, parentSampled });

describe('tracesSampler', () => {
    describe('infrastructure noise', () => {
        it('drops the Caddy on-demand TLS check', () => {
            expect(sample('GET /api/caddy/validDomain')).toBe(0);
        });

        it('drops the bull-monitor dashboard and its sub-paths', () => {
            expect(sample('GET /bull')).toBe(0);
            expect(sample('GET /bull/queues/blockSync')).toBe(0);
        });

        it('drops noise even when an upstream trace was sampled', () => {
            // Ordering matters: a sampled browser trace must not be able to
            // drag a high-frequency infrastructure endpoint back in.
            expect(sample('GET /api/caddy/validDomain', { parentSampled: true })).toBe(0);
        });
    });

    describe('distributed traces', () => {
        it('honours an upstream sampling decision', () => {
            expect(sample('GET /api/blocks', { parentSampled: true })).toBe(true);
            expect(sample('GET /api/blocks', { parentSampled: false })).toBe(false);
        });
    });

    describe('background queue jobs', () => {
        it('samples anything carrying a messaging destination at 0.1%', () => {
            expect(sample('blockSync', {
                attributes: { 'messaging.destination.name': 'blockSync' }
            })).toBe(0.001);
        });

        it('identifies jobs by attribute, not by name', () => {
            // Job names must never need hardcoding in the sampler.
            expect(sample('someFutureJob', {
                attributes: { 'messaging.destination.name': 'someFutureJob' }
            })).toBe(0.001);
        });
    });

    describe('user-facing API', () => {
        it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])('samples %s /api at 5%%', method => {
            expect(sample(`${method} /api/blocks`)).toBe(0.05);
        });
    });

    describe('everything else', () => {
        it('falls back to 1%', () => {
            expect(sample('GET /')).toBe(0.01);
            expect(sample('some random transaction')).toBe(0.01);
        });
    });
});
