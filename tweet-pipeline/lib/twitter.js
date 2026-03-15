/**
 * @fileoverview Twitter API v2 client for the tweet pipeline.
 * Wraps the twitter-api-v2 package with helpers for posting threads,
 * uploading media, and fetching engagement metrics.
 */

import { TwitterApi } from 'twitter-api-v2';

/**
 * Formats a hook tweet and optional replies into a thread array.
 * Caps at 5 total tweets (hook + max 4 replies).
 * @param {string} hook - The first tweet in the thread.
 * @param {string[]} [replies=[]] - Additional tweets in the thread.
 * @returns {string[]} Array of tweet texts, hook first.
 */
export function formatThread(hook, replies = []) {
    const all = [hook, ...replies];
    return all.slice(0, 5);
}

/**
 * Creates a Twitter API client with convenience methods for the tweet pipeline.
 * @param {{apiKey: string, apiSecret: string, accessToken: string, accessSecret: string}} creds
 *   Twitter API credentials. All four fields are required.
 * @returns {{
 *   uploadMedia: (filePath: string) => Promise<string>,
 *   postTweet: (text: string, options?: {mediaId?: string, replyToId?: string}) => Promise<{id: string}>,
 *   postThread: (tweets: string[], mediaId?: string) => Promise<string[]>,
 *   getMetrics: (tweetIds: string[]) => Promise<Array<{id: string, metrics: {likes: number, retweets: number, replies: number, impressions: number}}>>
 * }}
 * @throws {Error} If any required credential is missing.
 */
export function createTwitterClient(creds) {
    const required = ['apiKey', 'apiSecret', 'accessToken', 'accessSecret'];
    for (const field of required) {
        if (!creds[field]) {
            throw new Error(`Missing required Twitter credential: ${field}`);
        }
    }

    const api = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessSecret,
    });

    const v1 = api.v1;
    const v2 = api.v2;

    /**
     * Uploads an image file to Twitter.
     * @param {string} filePath - Absolute path to the image file.
     * @returns {Promise<string>} The media ID string.
     */
    async function uploadMedia(filePath) {
        const mediaId = await v1.uploadMedia(filePath, { mimeType: 'image/png' });
        return mediaId;
    }

    /**
     * Posts a single tweet.
     * @param {string} text - The tweet text.
     * @param {{mediaId?: string, replyToId?: string}} [options={}] - Optional media and reply settings.
     * @returns {Promise<{id: string}>} The posted tweet's ID.
     */
    async function postTweet(text, options = {}) {
        const payload = { text };

        if (options.mediaId) {
            payload.media = { media_ids: [options.mediaId] };
        }

        if (options.replyToId) {
            payload.reply = { in_reply_to_tweet_id: options.replyToId };
        }

        const result = await v2.tweet(payload);
        return { id: result.data.id };
    }

    /**
     * Posts an array of tweets as a thread. Image is attached to the first tweet only.
     * Each subsequent tweet replies to the previous one.
     * @param {string[]} tweets - Array of tweet texts.
     * @param {string} [mediaId] - Optional media ID to attach to the first tweet.
     * @returns {Promise<string[]>} Array of tweet IDs in order.
     */
    async function postThread(tweets, mediaId) {
        const ids = [];

        for (let i = 0; i < tweets.length; i++) {
            const options = {};

            if (i === 0 && mediaId) {
                options.mediaId = mediaId;
            }

            if (i > 0) {
                options.replyToId = ids[i - 1];
            }

            const result = await postTweet(tweets[i], options);
            ids.push(result.id);
        }

        return ids;
    }

    /**
     * Fetches public metrics for a list of tweet IDs.
     * @param {string[]} tweetIds - Array of tweet ID strings.
     * @returns {Promise<Array<{id: string, metrics: {likes: number, retweets: number, replies: number, impressions: number}}>>}
     */
    async function getMetrics(tweetIds) {
        const result = await v2.tweets(tweetIds, {
            'tweet.fields': 'public_metrics',
        });

        return (result.data || []).map(tweet => ({
            id: tweet.id,
            metrics: {
                likes: tweet.public_metrics?.like_count ?? 0,
                retweets: tweet.public_metrics?.retweet_count ?? 0,
                replies: tweet.public_metrics?.reply_count ?? 0,
                impressions: tweet.public_metrics?.impression_count ?? 0,
            },
        }));
    }

    return { uploadMedia, postTweet, postThread, getMetrics };
}

/**
 * Creates a Twitter client using environment variables.
 * Reads TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN,
 * and TWITTER_ACCESS_SECRET from process.env.
 * @returns {ReturnType<typeof createTwitterClient>}
 * @throws {Error} If any required environment variable is missing.
 */
export function createTwitterClientFromEnv() {
    return createTwitterClient({
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
}
