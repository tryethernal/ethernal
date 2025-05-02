const sgMail = require('@sendgrid/mail');
const { encode } = require('../lib/crypto');
const { getAppUrl, getSendgridApiKey, getSendgridSender } = require('../lib/env');

sgMail.setApiKey(getSendgridApiKey());

module.exports = async (job) => {
    const { email, userId } = job.data;
    const jwt = encode({ userId });
    const link = `${getAppUrl()}/auth?token=${jwt}`;

    return sgMail.send({
        to: email,
        from: getSendgridSender(),
        subject: 'Reset your password',
        text: `Click on this link to reset your password: ${link}`,
        html: `<p>Click on this link to reset your password: <a href="${link}">${link}</a></p>`
    });
}
