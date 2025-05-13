const sgMail = require('@sendgrid/mail');
const { encode } = require('../lib/crypto');
const { getAppUrl, getSendgridApiKey, getSendgridSender } = require('../lib/env');
const { isSendgridEnabled } = require('../lib/flags');

module.exports = async (job) => {
    const { email, userId } = job.data;
    const jwt = encode({ userId });
    const link = `${getAppUrl()}/auth?token=${jwt}`;

    if (!isSendgridEnabled())
        throw new Error('Sendgrid has not been enabled.');

    sgMail.setApiKey(getSendgridApiKey());

    return sgMail.send({
        to: email,
        from: getSendgridSender(),
        subject: 'Reset your password',
        text: `Click on this link to reset your password: ${link}`,
        html: `<p>Click on this link to reset your password: <a href="${link}">${link}</a></p>`
    });
}
