/**
 * @fileoverview Password reset email job.
 * Sends password reset link via Mailjet.
 * @module jobs/sendResetPasswordEmail
 */

const Mailjet = require('node-mailjet');
const logger = require('../lib/logger');
const { encode } = require('../lib/crypto');
const { getAppUrl, getMailjetPublicKey, getMailjetPrivateKey, getMailjetSender } = require('../lib/env');
const { isMailjetEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, userId } = job.data;
    const jwt = encode({ userId, email, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
    const link = `${getAppUrl()}/auth?token=${jwt}`;

    if (!isMailjetEnabled())
        throw new Error('Mailjet has not been enabled.');

    const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

    await mailjet.post('send', { version: 'v3.1' })
    .request({
        Messages: [
            {
                From: {
                    Email: getMailjetSender(),
                    Name: 'Ethernal Team'
                },
                To: [{
                    Email: email
                }],
                Subject: 'Reset your password',
                TextPart: `Click on this link to reset your password: ${link}`,
                HTMLPart: `<p>Click on this link to reset your password: <a href="${link}">${link}</a></p>`
            }
        ]
    })
    .catch(error => {
        logger.error(error);
        throw error;
    });
}
