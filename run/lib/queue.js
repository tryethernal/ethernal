/**
 * @fileoverview BullMQ job queue management utilities.
 * Provides functions to enqueue single or bulk jobs with priority and deduplication.
 * @module lib/queue
 */

const queues = require("../queues");
const { sanitize } = require("./utils");

/** @constant {number} Maximum number of jobs to add in a single bulk operation */
const MAX_BATCH_SIZE = 2000;

/**
 * Adds a single job to a named queue.
 *
 * @param {string} queueName - Name of the queue (e.g., 'blockSync', 'processContract')
 * @param {string} jobName - Unique identifier for this job
 * @param {Object} data - Job payload data
 * @param {number} [priority=1] - Job priority (lower = higher priority)
 * @param {Object} [repeat] - BullMQ repeat options for recurring jobs
 * @param {number} [delay] - Delay in milliseconds before processing
 * @param {boolean} [unique] - If true, uses jobName as jobId for deduplication
 * @returns {Promise<Job>} BullMQ Job instance
 * @example
 * await enqueue('blockSync', 'sync-block-123', { blockNumber: 123 }, 1);
 */
const enqueue = (queueName, jobName, data, priority = 1, repeat, delay, unique) => {
    const jobId = unique ? jobName : null;
    return queues[queueName].add(jobName, data, sanitize({ priority, repeat, jobId, delay }));
};

/**
 * Adds multiple jobs to a queue in batches.
 * Jobs are automatically batched to avoid memory issues with large arrays.
 *
 * @param {string} queueName - Name of the queue
 * @param {Array<Object>} jobData - Array of job objects
 * @param {string} jobData[].name - Job name (also used as jobId)
 * @param {Object} jobData[].data - Job payload
 * @param {number} [priority=10] - Priority for all jobs
 * @param {number} [maxBatchSize=2000] - Maximum jobs per batch
 * @returns {Promise<Array>} Results of all batch operations
 * @example
 * await bulkEnqueue('processContract', [
 *   { name: 'contract-0x123', data: { address: '0x123' } },
 *   { name: 'contract-0x456', data: { address: '0x456' } }
 * ]);
 */
const bulkEnqueue = (queueName, jobData, priority = 10, maxBatchSize = MAX_BATCH_SIZE) => {
    if (!queueName || !jobData || !jobData.length) return;
    const promises = [];
    const batchedJobs = [];
    for (let i = 0; i < jobData.length; i += maxBatchSize)
        batchedJobs.push(jobData.slice(i, i + maxBatchSize));

    for (let i = 0; i < batchedJobs.length; i++) {
        const jobs = batchedJobs[i].map(job => {
            return sanitize({
                name: job.name,
                data: job.data,
                opts: sanitize({ priority, jobId: job.name })
            })
        });
        promises.push(queues[queueName].addBulk(jobs));
    }

    return Promise.all(promises);
};

module.exports = {
    enqueue, bulkEnqueue
};
