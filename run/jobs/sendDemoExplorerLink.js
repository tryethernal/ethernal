const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { getAppDomain, getMailGunApiKey, getDemoExplorerSender, getMailGunDomain } = require('../lib/env');
const { isMailgunEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, explorerSlug } = job.data;

    if (!isMailgunEnabled())
        throw new Error('Mailgun has not been enabled.');

    const mailgun = new Mailgun(formData);

    const mg = mailgun.client({ username: 'api', key: getMailGunApiKey() });

    const explorerLink = `https://${explorerSlug}.${getAppDomain()}`;

    return mg.messages.create(getMailGunDomain(), {
        from: getDemoExplorerSender(),
        to: [email],
        subject: 'Your Ethernal demo explorer is ready',
        text: `Hello,

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
