import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUCKETS, SCHEDULE, TWITTER, PATHS, getScheduledTime } from '../config.js';

describe('config', () => {
    describe('BUCKETS', () => {
        it('exports exactly 5 buckets', () => {
            assert.equal(BUCKETS.length, 5);
        });

        it('each bucket has required fields', () => {
            for (const bucket of BUCKETS) {
                assert.ok(typeof bucket.slot === 'number', `slot missing or not number: ${JSON.stringify(bucket)}`);
                assert.ok(typeof bucket.baseHourUTC === 'number', `baseHourUTC missing or not number`);
                assert.ok(typeof bucket.label === 'string' && bucket.label.length > 0, `label missing`);
                assert.ok(typeof bucket.source === 'string' && bucket.source.length > 0, `source missing`);
            }
        });

        it('has slots numbered 1 through 5', () => {
            const slots = BUCKETS.map(b => b.slot).sort();
            assert.deepEqual(slots, [1, 2, 3, 4, 5]);
        });

        it('has baseHourUTC values in ascending order', () => {
            for (let i = 1; i < BUCKETS.length; i++) {
                assert.ok(BUCKETS[i].baseHourUTC > BUCKETS[i - 1].baseHourUTC,
                    `Bucket ${i} hour not greater than bucket ${i - 1}`);
            }
        });
    });

    describe('SCHEDULE', () => {
        it('has jitterMinutes set to 30', () => {
            assert.equal(SCHEDULE.jitterMinutes, 30);
        });

        it('has publishIntervalMinutes set to 10', () => {
            assert.equal(SCHEDULE.publishIntervalMinutes, 10);
        });
    });

    describe('TWITTER', () => {
        it('has maxTweetLength set to 280', () => {
            assert.equal(TWITTER.maxTweetLength, 280);
        });

        it('has maxThreadReplies set to 4', () => {
            assert.equal(TWITTER.maxThreadReplies, 4);
        });
    });

    describe('PATHS', () => {
        it('has queueDir, logDir, and templateDir', () => {
            assert.ok(typeof PATHS.queueDir === 'string');
            assert.ok(typeof PATHS.logDir === 'string');
            assert.ok(typeof PATHS.templateDir === 'string');
        });
    });

    describe('getScheduledTime', () => {
        it('returns a Date object', () => {
            const result = getScheduledTime(new Date('2026-03-15'), 13);
            assert.ok(result instanceof Date);
        });

        it('returns a time with jitter within +-30 minutes of base hour', () => {
            const baseDate = new Date('2026-03-15');
            const baseHour = 13;
            // Run multiple times to verify jitter stays in range
            for (let i = 0; i < 50; i++) {
                const result = getScheduledTime(baseDate, baseHour);
                const expectedCenter = new Date(baseDate);
                expectedCenter.setUTCHours(baseHour, 0, 0, 0);
                const diffMinutes = (result.getTime() - expectedCenter.getTime()) / (1000 * 60);
                assert.ok(diffMinutes >= -30 && diffMinutes <= 30,
                    `Jitter ${diffMinutes} min is outside +-30 range`);
            }
        });

        it('preserves the date from input', () => {
            const baseDate = new Date('2026-03-15');
            const result = getScheduledTime(baseDate, 7);
            assert.equal(result.getUTCFullYear(), 2026);
            assert.equal(result.getUTCMonth(), 2); // March = 2
            assert.equal(result.getUTCDate(), 15);
        });
    });
});
