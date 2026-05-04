/**
 * @fileoverview Demo explorer email job.
 * Sends welcome email with explorer link via Mailjet.
 * @module jobs/sendDemoExplorerLink
 */

const Mailjet = require('node-mailjet');
const logger = require('../lib/logger');
const { getAppDomain, getMailjetPublicKey, getMailjetPrivateKey, getDemoExplorerSender } = require('../lib/env');
const { isMailjetEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, explorerSlug } = job.data;

    if (!isMailjetEnabled())
        throw new Error('Mailjet has not been enabled.');

    const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

    const explorerLink = `https://${explorerSlug}.${getAppDomain()}?utm_source=transactional&utm_medium=email&utm_campaign=demo_ready`;

    await mailjet.post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: getDemoExplorerSender(),
                        Name: 'Antoine'
                    },
                    To: [{
                        Email: email
                    }],
                    Subject: 'Your Ethernal demo explorer is ready',
                    TextPart: `Hello,

            Your Ethernal demo explorer is ready. You can access it at ${explorerLink}.

            Feel free to reply to this email if you have any questions!

            Regards,

            The Ethernal team
        `,
                    HTMLPart: `
            <p>Hello,</p>
            <p>Your Ethernal demo explorer is ready. You can access it at <a href="${explorerLink}">${explorerLink}</a>.</p>
            <p>Feel free to reply to this email if you have any questions!</p>
            <p>Regards,</p>
            <p>The Ethernal team</p>
        `
            }
        ]
    })
    .catch(error => {
        logger.error(error);
        throw error;
    });
}
