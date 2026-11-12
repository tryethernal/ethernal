/**
 * @fileoverview Tests for queues.js: per-queue default job options, in particular the
 * immediate removal of finished updateExplorerSyncingProcess jobs.
 */

jest.mock('bullmq', () => ({
    Queue: jest.fn()
}));
jest.mock('../lib/redis', () => ({}));

const { Queue } = require('bullmq');
require('../queues');

/**
 * Returns the options of the single Queue constructed for a queue name.
 *
 * @param {string} name - Queue name
 * @returns {Object} Options passed to the BullMQ Queue constructor
 */
const optionsFor = (name) => {
    const calls = Queue.mock.calls.filter(call => call[0] === name);
    expect(calls).toHaveLength(1);
    return calls[0][1];
};

describe('queues', () => {
    it('Should construct updateExplorerSyncingProcess once, removing finished jobs immediately', () => {
        const options = optionsFor('updateExplorerSyncingProcess');
        expect(options.defaultJobOptions.removeOnComplete).toBe(true);
        expect(options.defaultJobOptions.removeOnFail).toBe(true);
        expect(options.defaultJobOptions.attempts).toBe(15);
        expect(options.defaultJobOptions.backoff).toEqual({ type: 'fixed', delay: 30000 });
        expect(options.defaultJobOptions.timeout).toBe(30000);
        expect(options.stalledInterval).toBe(29000);
        expect(options.maxStalledCount).toBe(5);
    });

    it('Should keep the shared retention for other high priority queues', () => {
        const options = optionsFor('blockSync');
        expect(options.defaultJobOptions.removeOnComplete).toEqual({ count: 100, age: 240 });
        expect(options.defaultJobOptions.removeOnFail).toEqual({ count: 50, age: 240 });
        expect(options.defaultJobOptions.attempts).toBe(15);
    });
});
