/**
 * @fileoverview Expired explorer cleanup job.
 * Deletes explorers that have exceeded their plan's expiration period.
 * Implements a 48h grace period: first pass sets deleteAfter, second pass (48h later) deletes.
 * @module jobs/removeExpiredExplorers
 */

const { Op } = require('sequelize');
const { Explorer, StripeSubscription, StripePlan, Workspace } = require('../models');
const { enqueue } = require('../lib/queue');
const Analytics = require('../lib/analytics');
const db = require('../lib/firebase');

const GRACE_PERIOD_HOURS = 48;

module.exports = async () => {
    const explorers = (await Explorer.findAll({
        include: [
            {
                model: StripeSubscription,
                as: 'stripeSubscription',
                include: {
                    model: StripePlan,
                    as: 'stripePlan',
                    where: {
                        capabilities: {
                            expiresAfter: {
                                [Op.not]: null
                            }
                        }
                    }
                }
            },
            {
                model: Workspace,
                as: 'workspace'
            }
        ]
    })).filter(e => !!e.stripeSubscription);

    const analytics = new Analytics();
    const deleted = [];
    try {
        for (let i = 0; i < explorers.length; i++) {
            const explorer = explorers[i];
            const expiresAfterDays = explorer.stripeSubscription.stripePlan.capabilities.expiresAfter;
            const expirationDate = new Date(explorer.createdAt);
            expirationDate.setDate(expirationDate.getDate() + expiresAfterDays);

            const daysDiff = (expirationDate - new Date()) / (1000 * 60 * 60 * 24);

            if (daysDiff <= 0) {
                // Check if already in grace period
                if (explorer.workspace.deleteAfter) {
                    // Grace period set — check if it has elapsed
                    if (new Date() >= explorer.workspace.deleteAfter) {
                        await db.skipDripEmailsForExplorer(explorer.id);
                        await explorer.safeDelete({ deleteSubscription: true });
                        await enqueue('workspaceReset', `workspaceReset-${explorer.workspaceId}`, {
                            workspaceId: explorer.workspaceId,
                            from: new Date(0),
                            to: new Date()
                        });
                        await enqueue('deleteWorkspace', `deleteWorkspace-${explorer.workspaceId}`, { workspaceId: explorer.workspaceId });
                        analytics.track(
                            explorer.workspace.userId ? String(explorer.workspace.userId) : 'system',
                            'explorer:demo_expired',
                            {
                                slug: explorer.slug,
                                workspaceId: explorer.workspaceId,
                                expiresAfterDays,
                                lifetimeDays: Math.round((new Date() - new Date(explorer.createdAt)) / (1000 * 60 * 60 * 24))
                            }
                        );
                        deleted.push(explorer.slug);
                    }
                    // else: still in grace period, skip
                } else {
                    // First expiration: set grace period, hide explorer, don't delete yet
                    const deleteAfter = new Date(Date.now() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
                    await explorer.workspace.update({
                        pendingDeletion: true,
                        public: false,
                        deleteAfter
                    });
                }
            }
        }
    } finally {
        analytics.shutdown();
    }
    return deleted;
};
