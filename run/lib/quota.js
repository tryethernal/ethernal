/**
 * @fileoverview Transaction quota rules shared by block storage (blockSync) and block removal (Block#safeDestroy).
 * Explorers on the default (demo) plan are counted when a block is stored, so the same rule must decide
 * when a reverted block gives its transactions back.
 * @module lib/quota
 */

const { getDefaultPlanSlug } = require('./env');
const { isSelfHosted } = require('./flags');

/**
 * Whether any explorer can be counted at storage time on this instance (hosted, with a default plan configured).
 * Lets callers skip loading the explorer when the answer is already no.
 * @returns {boolean}
 */
const canCountAtStorage = () => !isSelfHosted() && !!getDefaultPlanSlug();

/**
 * Returns the subscription id whose transaction quota is counted at storage time for this workspace,
 * or null when the quota is counted elsewhere (increaseStripeBillingQuota). Only public workspaces whose
 * explorer is on the default (demo) plan, on a hosted instance, are counted at storage time.
 * @param {Object} workspace - Workspace (only `public` is read)
 * @param {Object|null} explorer - Explorer with its `stripeSubscription` and that subscription's `stripePlan` (slug) loaded
 * @returns {number|null} Stripe subscription id, or null
 */
const getQuotaSubscriptionId = (workspace, explorer) => {
    const subscription = explorer && explorer.stripeSubscription;

    if (!canCountAtStorage() || !workspace || !workspace.public || !subscription || !subscription.stripePlan)
        return null;

    return subscription.stripePlan.slug === getDefaultPlanSlug() ? subscription.id : null;
};

module.exports = { canCountAtStorage, getQuotaSubscriptionId };
