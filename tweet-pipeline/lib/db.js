/**
 * @fileoverview SQLite state management for the tweet pipeline.
 * Replaces flat files (.promoted-articles, tweet-queue/*.json,
 * .processed-threads, .newsletter-source.json) with a single state.db.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '..', 'state.db');

/**
 * Creates a database connection and ensures schema exists.
 * @param {string} [dbPath] - Path to the SQLite database file.
 * @returns {object} Object with all query methods and a close() method.
 */
export function createDb(dbPath = DEFAULT_DB_PATH) {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hook TEXT NOT NULL,
            thread TEXT DEFAULT '[]',
            image_spec TEXT,
            image_path TEXT DEFAULT '',
            bucket TEXT NOT NULL,
            source_id TEXT NOT NULL,
            scheduled_at TEXT NOT NULL,
            slot INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            posted INTEGER NOT NULL DEFAULT 0,
            tweet_ids TEXT DEFAULT '[]',
            posted_at TEXT,
            post_error TEXT
        );

        CREATE TABLE IF NOT EXISTS promotions (
            slug TEXT PRIMARY KEY,
            promoted_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS processed_threads (
            thread_id TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS newsletter_sources (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS processed_reddit_posts (
            post_id TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    const stmts = {
        insertTweet: db.prepare(`
            INSERT INTO tweets (hook, thread, image_spec, image_path, bucket, source_id, scheduled_at, slot)
            VALUES (@hook, @thread, @imageSpec, @imagePath, @bucket, @sourceId, @scheduledAt, @slot)
        `),
        getPending: db.prepare(`
            SELECT * FROM tweets
            WHERE posted = 0 AND scheduled_at <= datetime('now')
            ORDER BY scheduled_at ASC
        `),
        markPosted: db.prepare(`
            UPDATE tweets SET posted = 1, tweet_ids = @tweetIds, posted_at = datetime('now')
            WHERE id = @id
        `),
        setPostError: db.prepare(`
            UPDATE tweets SET post_error = @error WHERE id = @id
        `),
        recentSourceIds: db.prepare(`
            SELECT source_id FROM tweets
            WHERE created_at >= datetime('now', '-' || @days || ' days')
        `),
        recentHooks: db.prepare(`
            SELECT hook FROM tweets
            WHERE created_at >= datetime('now', '-' || @days || ' days')
        `),
        tweetIdsForEngagement: db.prepare(`
            SELECT tweet_ids FROM tweets
            WHERE posted = 1 AND posted_at >= datetime('now', '-' || @days || ' days')
        `),
        lastPostedAt: db.prepare(`
            SELECT posted_at FROM tweets
            WHERE posted = 1 AND posted_at IS NOT NULL
            ORDER BY posted_at DESC LIMIT 1
        `),
        isPromoted: db.prepare('SELECT 1 FROM promotions WHERE slug = ?'),
        insertPromotion: db.prepare('INSERT OR IGNORE INTO promotions (slug) VALUES (?)'),
        allPromotedSlugs: db.prepare('SELECT slug FROM promotions'),
        isThreadProcessed: db.prepare('SELECT 1 FROM processed_threads WHERE thread_id = ?'),
        insertThread: db.prepare('INSERT OR IGNORE INTO processed_threads (thread_id) VALUES (?)'),
        upsertNewsletter: db.prepare(`
            INSERT OR REPLACE INTO newsletter_sources (id, data, created_at)
            VALUES (@id, @data, datetime('now'))
        `),
        getFreshNewsletter: db.prepare(`
            SELECT data FROM newsletter_sources
            WHERE id = @id AND created_at >= datetime('now', '-24 hours')
        `),
        deleteNewsletter: db.prepare('DELETE FROM newsletter_sources WHERE id = ?'),
        getFreshCompetitor: db.prepare(`
            SELECT data FROM newsletter_sources
            WHERE id = @id AND created_at >= datetime('now', '-72 hours')
        `),
        isRedditProcessed: db.prepare('SELECT 1 FROM processed_reddit_posts WHERE post_id = ?'),
        insertRedditPost: db.prepare('INSERT OR IGNORE INTO processed_reddit_posts (post_id) VALUES (?)'),
    };

    const markThreadsProcessedTx = db.transaction((threadIds) => {
        for (const tid of threadIds) {
            stmts.insertThread.run(tid);
        }
    });

    return {
        db, // exposed for tests only

        addTweet(tweet) {
            // Normalize ISO timestamps to SQLite format (space separator, no T/Z)
            const scheduledAt = (tweet.scheduledAt || '').replace('T', ' ').replace('Z', '').replace(/\+.*$/, '');
            return stmts.insertTweet.run({
                hook: tweet.hook,
                thread: JSON.stringify(tweet.thread || []),
                imageSpec: tweet.imageSpec ? JSON.stringify(tweet.imageSpec) : null,
                imagePath: tweet.imagePath || '',
                bucket: tweet.bucket,
                sourceId: tweet.sourceId,
                scheduledAt,
                slot: tweet.slot,
            });
        },

        getPendingTweets() {
            return stmts.getPending.all();
        },

        markTweetPosted(id, tweetIds) {
            stmts.markPosted.run({
                id,
                tweetIds: JSON.stringify(tweetIds),
            });
        },

        setPostError(id, error) {
            stmts.setPostError.run({ id, error });
        },

        getRecentSourceIds(days) {
            return stmts.recentSourceIds.all({ days }).map(r => r.source_id);
        },

        getRecentHooks(days) {
            return stmts.recentHooks.all({ days }).map(r => r.hook);
        },

        getTweetIdsForEngagement(days) {
            const rows = stmts.tweetIdsForEngagement.all({ days });
            return rows.flatMap(r => JSON.parse(r.tweet_ids));
        },

        getLastPostedAt() {
            const row = stmts.lastPostedAt.get();
            return row ? row.posted_at : null;
        },

        isPromoted(slug) {
            return !!stmts.isPromoted.get(slug);
        },

        markPromoted(slug) {
            stmts.insertPromotion.run(slug);
        },

        getPromotedSlugs() {
            return stmts.allPromotedSlugs.all().map(r => r.slug);
        },

        isThreadProcessed(threadId) {
            return !!stmts.isThreadProcessed.get(threadId);
        },

        markThreadsProcessed(threadIds) {
            markThreadsProcessedTx(threadIds);
        },

        saveNewsletterSource(data) {
            stmts.upsertNewsletter.run({ id: 1, data: JSON.stringify(data) });
        },

        getNewsletterSource() {
            const row = stmts.getFreshNewsletter.get({ id: 1 });
            return row ? JSON.parse(row.data) : null;
        },

        consumeNewsletterSource() {
            stmts.deleteNewsletter.run(1);
        },

        saveBlogCandidate(data) {
            stmts.upsertNewsletter.run({ id: 2, data: JSON.stringify(data) });
        },

        getBlogCandidate() {
            const row = stmts.getFreshNewsletter.get({ id: 2 });
            return row ? JSON.parse(row.data) : null;
        },

        saveCompetitorSource(data) {
            stmts.upsertNewsletter.run({ id: 3, data: JSON.stringify(data) });
        },

        getCompetitorSource() {
            const row = stmts.getFreshCompetitor.get({ id: 3 });
            return row ? JSON.parse(row.data) : null;
        },

        consumeCompetitorSource() {
            stmts.deleteNewsletter.run(3);
        },

        isRedditPostProcessed(postId) {
            return !!stmts.isRedditProcessed.get(postId);
        },

        markRedditPostsProcessed(postIds) {
            const tx = db.transaction((ids) => {
                for (const id of ids) stmts.insertRedditPost.run(id);
            });
            tx(postIds);
        },

        close() {
            db.close();
        },
    };
}

/** Singleton for production use -- all CLI scripts share this instance. */
let _instance;
export function getDb() {
    if (!_instance) _instance = createDb();
    return _instance;
}
