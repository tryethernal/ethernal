#!/usr/bin/env node
/**
 * One-time migration: imports existing flat-file state into SQLite.
 * Run on the server: node lib/cli/migrate-state.js [queue-dir]
 *
 * Imports:
 * - /home/blog/tweet-queue/tweet-*.json -> tweets table
 * - .promoted-articles -> promotions table
 * - .processed-threads -> processed_threads table
 * - .newsletter-source.json -> newsletter_sources table (id=1)
 * - .blog-candidate.json -> newsletter_sources table (id=2)
 */
import { getDb } from '../db.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pipelineDir = join(__dirname, '..', '..');
const queueDir = process.argv[2] || '/home/blog/tweet-queue';

const db = getDb();
let counts = { tweets: 0, promotions: 0, threads: 0, newsletter: 0, blog: 0 };

// 1. Import tweet queue files
if (existsSync(queueDir)) {
    const files = readdirSync(queueDir).filter(f => f.startsWith('tweet-') && f.endsWith('.json'));
    for (const file of files) {
        try {
            const tweet = JSON.parse(readFileSync(join(queueDir, file), 'utf-8'));
            const result = db.addTweet({
                hook: tweet.hook,
                thread: tweet.thread || [],
                imageSpec: tweet.imageSpec || null,
                imagePath: tweet.imagePath || '',
                bucket: tweet.bucket,
                sourceId: tweet.sourceId,
                scheduledAt: tweet.scheduledAt,
                slot: parseInt(file.match(/slot(\d)/)?.[1] || '0'),
            });
            const rowId = Number(result.lastInsertRowid);
            if (tweet.posted) {
                db.markTweetPosted(rowId, tweet.tweetIds || []);
            }
            if (tweet.postError) {
                db.setPostError(rowId, tweet.postError);
            }
            counts.tweets++;
        } catch (err) {
            console.error(`Skipping ${file}: ${err.message}`);
        }
    }
}

// 2. Import promoted articles
const promotedFile = join(pipelineDir, '.promoted-articles');
if (existsSync(promotedFile)) {
    const slugs = readFileSync(promotedFile, 'utf-8').split('\n').filter(Boolean);
    for (const slug of slugs) {
        db.markPromoted(slug.trim());
        counts.promotions++;
    }
}

// 3. Import processed threads
const threadsFile = join(pipelineDir, '.processed-threads');
if (existsSync(threadsFile)) {
    const threads = readFileSync(threadsFile, 'utf-8').split('\n').filter(Boolean);
    db.markThreadsProcessed(threads.map(t => t.trim()));
    counts.threads = threads.length;
}

// 4. Import newsletter source
const nlFile = join(pipelineDir, '.newsletter-source.json');
if (existsSync(nlFile)) {
    try {
        db.saveNewsletterSource(JSON.parse(readFileSync(nlFile, 'utf-8')));
        counts.newsletter = 1;
    } catch { /* skip if malformed */ }
}

// 5. Import blog candidate
const blogFile = join(pipelineDir, '.blog-candidate.json');
if (existsSync(blogFile)) {
    try {
        db.saveBlogCandidate(JSON.parse(readFileSync(blogFile, 'utf-8')));
        counts.blog = 1;
    } catch { /* skip if malformed */ }
}

console.log('Migration complete:', counts);
