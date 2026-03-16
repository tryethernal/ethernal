/**
 * @fileoverview Sends a single drip email for a demo explorer via Mailjet.
 * Called by processDripEmails for each due email.
 * @module jobs/sendDripEmail
 */

const Mailjet = require('node-mailjet');
const logger = require('../lib/logger');
const db = require('../lib/firebase');
const Analytics = require('../lib/analytics');
const { getAppDomain, getMailjetPublicKey, getMailjetPrivateKey, getDemoExplorerSender, getDripUnsubscribeSecret, getNodeEnv } = require('../lib/env');
const { isDripEmailEnabled } = require('../lib/flags');
const { getEmailContent } = require('../emails/drip-content');
const { encode } = require('../lib/crypto');
const { Explorer } = require('../models');
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

    // Fetch schedule once — used for skip check and migration URL
    let schedule;
    if (scheduleId)
        schedule = await db.getDripScheduleById(scheduleId);

    // Re-check schedule state before sending — user may have unsubscribed since enqueue
    if (scheduleId) {
        if (!schedule || schedule.skipped || schedule.sentAt) {
            logger.info('Drip email skipped (unsubscribed, cancelled, or already sent)', { scheduleId, step });
            return;
        }
    }

    const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());
    const appDomain = getAppDomain();
    const explorerLink = `https://${explorerSlug}.${appDomain}`;
    const unsubscribeToken = generateUnsubscribeToken(email);
    const unsubscribeUrl = `https://${appDomain}/api/demo/unsubscribe?token=${unsubscribeToken}`;

    // Steps 3-6 link to migration flow; steps 1-2 link to the explorer
    let migrateUrl = `https://app.${appDomain}`;
    if (step >= 3 && schedule && schedule.explorerId) {
        const explorerToken = encode({ explorerId: schedule.explorerId });
        migrateUrl = `https://app.${appDomain}/?explorerToken=${explorerToken}`;
    }

    // Load enrichment for steps 3+ (personalized copy)
    let enrichmentData = {};
    if (step >= 3 && schedule && schedule.explorerId) {
        const explorer = await Explorer.findByPk(schedule.explorerId, { attributes: ['enrichment'] });
        if (explorer?.enrichment && !explorer.enrichment.error) {
            enrichmentData = {
                teamContext: explorer.enrichment.companyContext,
                tailoredBenefits: explorer.enrichment.tailoredBenefits,
                expirationWarning: explorer.enrichment.expirationWarning,
                recoveryHook: explorer.enrichment.recoveryHook
            };
        }
    }

    const content = getEmailContent(step, {
        explorerSlug,
        explorerLink,
        migrateUrl,
        email,
        unsubscribeUrl,
        appDomain,
        activitySummary,
        teamContext,
        ...enrichmentData
    });

    const senderRaw = getDemoExplorerSender();
    const senderMatch = senderRaw.match(/^(.+?)\s*<(.+)>$/);
    const senderName = senderMatch ? senderMatch[1].trim() : 'Ethernal';
    const senderEmail = senderMatch ? senderMatch[2] : senderRaw;

    const isProd = getNodeEnv() === 'production';
    const message = {
        From: {
            Email: senderEmail,
            Name: senderName
        },
        To: [{ Email: email }],
        Subject: content.subject,
        TextPart: content.textPart,
        CustomID: `drip-step-${step}-explorer-${explorerSlug}`,
        TrackOpens: isProd ? 'enabled' : 'disabled',
        TrackClicks: isProd ? 'enabled' : 'disabled'
    };

    if (content.htmlPart)
        message.HTMLPart = content.htmlPart;

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
