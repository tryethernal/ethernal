/**
 * @fileoverview Sends a single drip email for a demo explorer via Mailjet.
 * Called by processDripEmails for each due email.
 * @module jobs/sendDripEmail
 */

const Mailjet = require('node-mailjet');
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const Analytics = require('../lib/analytics');
const { getAppDomain, getMailjetPublicKey, getMailjetPrivateKey, getDemoExplorerSender, getDripUnsubscribeSecret } = require('../lib/env');
const { isDripEmailEnabled } = require('../lib/flags');
const { getEmailContent } = require('../emails/drip-content');
const crypto = require('crypto');

/**
 * Generates encrypted unsubscribe token for an email address.
 * Uses AES-256-CBC with a random IV prepended to the ciphertext.
 * @param {string} email - Email to encode
 * @returns {string} URL-safe base64 token (IV + ciphertext)
 */
function generateUnsubscribeToken(email) {
    const key = crypto.scryptSync(getDripUnsubscribeSecret(), 'ethernal-drip', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(email, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    return iv.toString('base64url') + '.' + encrypted;
}

/**
 * Sends a drip email for a given step and enqueues the next step if applicable.
 * @param {Object} job - BullMQ job object
 * @param {Object} job.data - Job payload
 * @param {string} job.data.email - Recipient email address
 * @param {string} job.data.explorerSlug - Demo explorer slug
 * @param {number} job.data.step - Drip email step number
 * @param {string} [job.data.activitySummary] - Optional activity summary for personalization
 * @param {string} [job.data.teamContext] - Optional team context for personalization
 * @param {number} [job.data.scheduleId] - DemoDripSchedule row ID to mark as sent
 * @returns {Promise<void>}
 * @throws {Error} If Mailjet is not enabled or send fails
 */
module.exports = async (job) => {
    const { email, explorerSlug, step, activitySummary, teamContext, scheduleId } = job.data;

    if (!isDripEmailEnabled())
        throw new Error('Drip emails have not been enabled.');

    const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());
    const explorerLink = `https://${explorerSlug}.${getAppDomain()}`;
    const unsubscribeToken = generateUnsubscribeToken(email);
    const unsubscribeUrl = `https://${getAppDomain()}/api/demo/unsubscribe?token=${unsubscribeToken}`;

    const content = getEmailContent(step, {
        explorerSlug,
        explorerLink,
        email,
        unsubscribeUrl,
        appDomain: getAppDomain(),
        activitySummary,
        teamContext
    });

    const message = {
        From: {
            Email: getDemoExplorerSender(),
            Name: 'Antoine'
        },
        To: [{ Email: email }],
        Subject: content.subject,
        TextPart: content.textPart,
        CustomID: `drip-step-${step}-explorer-${explorerSlug}`
    };

    if (content.htmlPart)
        message.HTMLPart = content.htmlPart;

    // Re-check schedule state before sending — user may have unsubscribed since enqueue
    if (scheduleId) {
        const schedule = await db.getDripScheduleById(scheduleId);
        if (!schedule || schedule.skipped || schedule.sentAt) {
            logger.info('Drip email skipped (unsubscribed, cancelled, or already sent)', { scheduleId, step });
            return;
        }
    }

    await mailjet.post('send', { version: 'v3.1' })
        .request({ Messages: [message] })
        .catch(error => {
            logger.error(error);
            throw error;
        });

    // Mark as sent AFTER successful Mailjet send (not before)
    if (scheduleId)
        await db.markDripEmailSent(scheduleId);

    const analytics = new Analytics();
    analytics.track(
        `explorer:${explorerSlug}`,
        'email:drip_sent',
        { step, explorerSlug }
    );
    analytics.shutdown();
};
