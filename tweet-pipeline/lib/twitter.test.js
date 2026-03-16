import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { formatThread, createTwitterClient } from './twitter.js';

describe('twitter', () => {
    describe('formatThread', () => {
        it('returns array of 1 for a single tweet', () => {
            const result = formatThread('Just a hook');
            assert.deepEqual(result, ['Just a hook']);
        });

        it('returns hook + replies in correct order', () => {
            const result = formatThread('Hook tweet', ['Reply 1', 'Reply 2']);
            assert.deepEqual(result, ['Hook tweet', 'Reply 1', 'Reply 2']);
        });

        it('caps at 5 total tweets', () => {
            const replies = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
            const result = formatThread('Hook', replies);
            assert.equal(result.length, 5);
            assert.equal(result[0], 'Hook');
            assert.equal(result[4], 'R4');
        });
    });

    describe('createTwitterClient', () => {
        it('throws if apiKey is missing', () => {
            assert.throws(
                () => createTwitterClient({
                    apiSecret: 'secret',
                    accessToken: 'token',
                    accessSecret: 'asecret',
                }),
                { message: /apiKey/i }
            );
        });

        it('throws if apiSecret is missing', () => {
            assert.throws(
                () => createTwitterClient({
                    apiKey: 'key',
                    accessToken: 'token',
                    accessSecret: 'asecret',
                }),
                { message: /apiSecret/i }
            );
        });

        it('throws if accessToken is missing', () => {
            assert.throws(
                () => createTwitterClient({
                    apiKey: 'key',
                    apiSecret: 'secret',
                    accessSecret: 'asecret',
                }),
                { message: /accessToken/i }
            );
        });

        it('throws if accessSecret is missing', () => {
            assert.throws(
                () => createTwitterClient({
                    apiKey: 'key',
                    apiSecret: 'secret',
                    accessToken: 'token',
                }),
                { message: /accessSecret/i }
            );
        });

        it('returns client with expected methods for valid creds', () => {
            const client = createTwitterClient({
                apiKey: 'key',
                apiSecret: 'secret',
                accessToken: 'token',
                accessSecret: 'asecret',
            });

            assert.equal(typeof client.uploadMedia, 'function');
            assert.equal(typeof client.postTweet, 'function');
            assert.equal(typeof client.postThread, 'function');
            assert.equal(typeof client.getMetrics, 'function');
        });
    });
});
