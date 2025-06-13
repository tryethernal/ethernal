const sgMail = require('@sendgrid/mail');
const { getAppDomain, getSendgridApiKey, getDemoExplorerSender } = require('../lib/env');
const { isSendgridEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, explorerSlug } = job.data;

    if (!isSendgridEnabled())
        throw new Error('Sendgrid has not been enabled.');

    sgMail.setApiKey(getSendgridApiKey());

    const explorerLink = `https://${explorerSlug}.${getAppDomain()}`;

    return sgMail.send({
        to: email,
        from: getDemoExplorerSender(),
        subject: 'Your Ethernal demo explorer is ready',
        text: `
            Hello,

            Your Ethernal demo explorer is ready. You can access it at ${explorerLink}.

            Feel free to reply to this email if you have any questions!

            Regards,

            The Ethernal team
        `,
        html: `
            <p>Hello,</p>
            <p>Your Ethernal demo explorer is ready. You can access it at <a href="${explorerLink}">${explorerLink}</a>.</p>
            <p>Feel free to reply to this email if you have any questions!</p>
            <p>Regards,</p>
            <p>The Ethernal team</p>
        `
    });
}
