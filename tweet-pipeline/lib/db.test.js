import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDb } from './db.js';

describe('db', () => {
    let tmpDir, db;

    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), 'tweet-db-test-'));
        db = createDb(join(tmpDir, 'test.db'));
    });

    afterEach(() => {
        db.close();
        rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('tweets', () => {
        it('addTweet inserts and getPendingTweets returns it when past scheduledAt', () => {
            const tweet = {
                hook: 'Test hook',
                thread: ['reply1'],
                imageSpec: { type: 'stat_card' },
                imagePath: '/tmp/img.png',
                bucket: 'Product tip',
                sourceId: 'test-source',
                scheduledAt: new Date(Date.now() - 60000).toISOString(),
                slot: 3,
            };
            db.addTweet(tweet);
            const pending = db.getPendingTweets();
            assert.equal(pending.length, 1);
            assert.equal(pending[0].hook, 'Test hook');
            assert.deepEqual(JSON.parse(pending[0].thread), ['reply1']);
        });

        it('getPendingTweets excludes future and posted tweets', () => {
            db.addTweet({
                hook: 'Future', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'future', slot: 1,
                scheduledAt: new Date(Date.now() + 3600000).toISOString(),
            });
            db.addTweet({
                hook: 'Past posted', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'past-posted', slot: 2,
                scheduledAt: new Date(Date.now() - 60000).toISOString(),
            });
            db.markTweetPosted(2, ['12345']);

            const pending = db.getPendingTweets();
            assert.equal(pending.length, 0);
        });

        it('markTweetPosted updates the tweet', () => {
            db.addTweet({
                hook: 'To post', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'mark-test', slot: 1,
                scheduledAt: new Date(Date.now() - 60000).toISOString(),
            });
            db.markTweetPosted(1, ['111', '222']);

            const pending = db.getPendingTweets();
            assert.equal(pending.length, 0);
        });

        it('getRecentSourceIds returns sourceIds from last N days', () => {
            db.addTweet({
                hook: 'Recent', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'recent-src', slot: 1,
                scheduledAt: new Date().toISOString(),
            });
            const ids = db.getRecentSourceIds(30);
            assert.ok(ids.includes('recent-src'));
        });

        it('getRecentHooks returns hooks from last N days', () => {
            db.addTweet({
                hook: 'My hook text', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'hook-test', slot: 1,
                scheduledAt: new Date().toISOString(),
            });
            const hooks = db.getRecentHooks(30);
            assert.ok(hooks.includes('My hook text'));
        });

        it('getTweetIdsForEngagement returns IDs from posted tweets in last N days', () => {
            db.addTweet({
                hook: 'Engagement', thread: [], imageSpec: null, imagePath: '',
                bucket: 'Test', sourceId: 'eng-test', slot: 1,
                scheduledAt: new Date(Date.now() - 60000).toISOString(),
            });
            db.markTweetPosted(1, ['aaa', 'bbb']);
            const ids = db.getTweetIdsForEngagement(7);
            assert.deepEqual(ids, ['aaa', 'bbb']);
        });

        it('getTweetIdsForEngagement returns empty array when no posted tweets', () => {
            const ids = db.getTweetIdsForEngagement(7);
            assert.deepEqual(ids, []);
        });
    });

    describe('promotions', () => {
        it('isPromoted returns false for unknown slug', () => {
            assert.equal(db.isPromoted('unknown'), false);
        });

        it('markPromoted + isPromoted round-trips', () => {
            db.markPromoted('my-article');
            assert.equal(db.isPromoted('my-article'), true);
        });

        it('getPromotedSlugs returns all slugs', () => {
            db.markPromoted('a');
            db.markPromoted('b');
            const slugs = db.getPromotedSlugs();
            assert.deepEqual(slugs.sort(), ['a', 'b']);
        });

        it('markPromoted is idempotent', () => {
            db.markPromoted('dup');
            db.markPromoted('dup');
            assert.equal(db.getPromotedSlugs().length, 1);
        });
    });

    describe('processed_threads', () => {
        it('isThreadProcessed returns false for unknown', () => {
            assert.equal(db.isThreadProcessed('thread-1'), false);
        });

        it('markThreadsProcessed + isThreadProcessed round-trips', () => {
            db.markThreadsProcessed(['t1', 't2']);
            assert.equal(db.isThreadProcessed('t1'), true);
            assert.equal(db.isThreadProcessed('t2'), true);
            assert.equal(db.isThreadProcessed('t3'), false);
        });
    });

    describe('newsletter_sources', () => {
        it('saveNewsletterSource + getNewsletterSource round-trips', () => {
            const data = { title: 'Story', content: 'text', score: 80 };
            db.saveNewsletterSource(data);
            const result = db.getNewsletterSource();
            assert.equal(result.title, 'Story');
        });

        it('getNewsletterSource returns null when stale', () => {
            const data = { title: 'Old', content: 'old text', score: 70 };
            db.db.prepare(
                `INSERT OR REPLACE INTO newsletter_sources (id, data, created_at)
                 VALUES (1, ?, datetime('now', '-25 hours'))`
            ).run(JSON.stringify(data));
            assert.equal(db.getNewsletterSource(), null);
        });

        it('consumeNewsletterSource removes the source', () => {
            db.saveNewsletterSource({ title: 'Temp', score: 50 });
            assert.ok(db.getNewsletterSource() !== null);
            db.consumeNewsletterSource();
            assert.equal(db.getNewsletterSource(), null);
        });

        it('saveBlogCandidate + getBlogCandidate round-trips', () => {
            const data = { title: 'Blog idea', score: 90 };
            db.saveBlogCandidate(data);
            const result = db.getBlogCandidate();
            assert.equal(result.title, 'Blog idea');
        });
    });
});
