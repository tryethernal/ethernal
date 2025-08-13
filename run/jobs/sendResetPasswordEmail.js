const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { encode } = require('../lib/crypto');
const { getAppUrl, getMailGunApiKey, getMailGunSender, getMailGunDomain } = require('../lib/env');
const { isMailgunEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, userId } = job.data;
    const jwt = encode({ userId, email, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
    const link = `${getAppUrl()}/auth?token=${jwt}`;

    if (!isMailgunEnabled())
        throw new Error('Mailgun has not been enabled.');

    const mailgun = new Mailgun(formData);

    const mg = mailgun.client({ username: 'api', key: getMailGunApiKey() });

    return mg.messages.create(getMailGunDomain(), {
        to: email,
        from: getMailGunSender(),
        subject: 'Reset your password',
        text: `Click on this link to reset your password: ${link}`,
        html: `<p>Click on this link to reset your password: <a href="${link}">${link}</a></p>`
    });
}
