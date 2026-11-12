/**
 * @fileoverview Names of the queues that are only registered on hosted (non self-hosted) instances.
 * Single source of truth shared by the worker priorities and the enqueue guards.
 * @module workers/hostedOnlyQueues
 */

/** Queues registered only when not self-hosted, by priority tier. */
module.exports = {
    high: ['updateApproximatedRecord', 'increaseStripeBillingQuota'],
    low: ['sendDemoExplorerLink', 'sendDripEmail', 'processDripEmails', 'enrichDemoProfile'],
};
