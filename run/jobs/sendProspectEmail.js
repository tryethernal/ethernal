/**
 * @fileoverview Sends an approved prospect email via Mailjet.
 * Enqueues a delayed follow-up check after sending.
 * @module jobs/sendProspectEmail
 */
const Mailjet = require('node-mailjet');
const { Prospect } = require('../models');
const { isProspectingEnabled } = require('../lib/flags');
const { getMailjetPublicKey, getMailjetPrivateKey, getProspectSenderEmail, getProspectReplyTo, getDripUnsubscribeSecret } = require('../lib/env');
const { enqueue } = require('../lib/queue');
const Analytics = require('../lib/analytics');
const logger = require('../lib/logger');
const crypto = require('crypto');

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Generate encrypted unsubscribe token for a prospect email.
 * @param {string} email
 * @returns {string}
 */
function generateUnsubscribeToken(email) {
    const key = crypto.scryptSync(getDripUnsubscribeSecret(), 'ethernal-prospect', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(email, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');
    return iv.toString('base64url') + '.' + encrypted;
}

/**
 * @param {Object} job
 * @param {number} job.data.prospectId
 */
module.exports = async (job) => {
    if (!isProspectingEnabled()) return;

    const { prospectId } = job.data;
    const prospect = await Prospect.findByPk(prospectId);

    if (!prospect) throw new Error('Prospect not found');
    if (prospect.status !== 'approved') return;
    if (!prospect.contactEmail || !prospect.emailSubject || !prospect.emailBody)
        throw new Error('Prospect missing email data');

    const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

    const unsubscribeToken = generateUnsubscribeToken(prospect.contactEmail);
    const unsubscribeUrl = `https://app.tryethernal.com/api/prospects/unsubscribe?token=${unsubscribeToken}`;

    const body = prospect.emailBody.replace('{{unsubscribeUrl}}', unsubscribeUrl);
    const isFollowUp = prospect.followUpCount > 0;

    await mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [{
            From: { Email: getProspectSenderEmail(), Name: 'Antoine from Ethernal' },
            To: [{ Email: prospect.contactEmail, Name: prospect.contactName || '' }],
            ReplyTo: { Email: getProspectReplyTo() },
            Subject: prospect.emailSubject,
            TextPart: body,
            Headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
            CustomID: `prospect-${prospect.id}-fu${prospect.followUpCount}`
        }]
    });

    await prospect.update({ status: 'sent', sentAt: new Date() });
    await prospect.logEvent(isFollowUp ? 'follow_up_sent' : 'sent', { followUpCount: prospect.followUpCount });

    const analytics = new Analytics();
    analytics.track(null, 'prospect:email_sent', {
        domain: prospect.domain,
        followUpCount: prospect.followUpCount
    });
    analytics.shutdown();

    // Enqueue follow-up check in 5 days (if under max follow-ups)
    if (prospect.followUpCount < 2) {
        await enqueue(
            'prospectFollowUpCheck',
            `prospectFollowUpCheck-${prospect.id}-fu${prospect.followUpCount + 1}`,
            { prospectId: prospect.id },
            10,
            null,
            FIVE_DAYS_MS
        );
    }

    logger.info('Prospect email sent', { prospectId, to: prospect.contactEmail, followUp: prospect.followUpCount });
};

module.exports.generateUnsubscribeToken = generateUnsubscribeToken;
