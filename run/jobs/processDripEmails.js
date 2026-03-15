/**
 * @fileoverview Recurring job that processes pending drip emails.
 * Runs every 15 minutes via BullMQ scheduler.
 * @module jobs/processDripEmails
 */

const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const logger = require('../lib/logger');

/**
 * Fetches all pending drip email schedules and enqueues a sendDripEmail job for each.
 * Skips explorers that have migrated away from demo (isDemo=false).
 * @returns {Promise<void>}
 */
module.exports = async () => {
    const pendingEmails = await db.getPendingDripEmails();

    if (!pendingEmails.length)
        return;

    for (const schedule of pendingEmails) {
        try {
            if (!schedule.explorer || !schedule.explorer.isDemo) {
                await db.skipDripEmailsForExplorer(schedule.explorerId);
                continue;
            }

            await enqueue(
                'sendDripEmail',
                `sendDripEmail-${schedule.id}`,
                {
                    scheduleId: schedule.id,
                    email: schedule.email,
                    explorerSlug: schedule.explorer.slug,
                    step: schedule.step
                },
                1
            );
        } catch (error) {
            logger.error(error.message, {
                location: 'jobs.processDripEmails',
                scheduleId: schedule.id,
                step: schedule.step,
                error
            });
        }
    }
};
