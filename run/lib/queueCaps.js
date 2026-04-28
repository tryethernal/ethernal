/**
 * @fileoverview Per-workspace queue cap utilities.
 * Identifies low-tier workspaces, returns per-queue caps, and exposes
 * Redis-side helpers for counting and trimming waiting jobs by workspace.
 *
 * Two consumers:
 *  - run/lib/queue.js — synchronous cap check inside enqueue/bulkEnqueue.
 *  - run/jobs/queueMonitoring.js — periodic sweep that trims direct-Redis writes from cli-light.
 *
 * @module lib/queueCaps
 */

const env = require('./env');

/**
 * Returns the per-queue waiting-job cap for a low-tier workspace.
 * @param {string} queueName
 * @returns {number} Cap, or Infinity if the queue is not capped.
 */
const getCap = (queueName) => {
    if (queueName === 'blockSync') return env.queueCapBlockSync();
    if (queueName === 'receiptSync') return env.queueCapReceiptSync();
    return Infinity;
};

module.exports = { getCap };
