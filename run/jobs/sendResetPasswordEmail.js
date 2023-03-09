const sgMail = require('@sendgrid/mail')
const { encode } = require('../lib/crypto');
const { isSendgridEnabled } = require('../lib/flags');

module.exports = async job => {
    const data = job.data;

    if (isSendgridEnabled())
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    else
        throw new Error('Sendgrid has not been enabled.');

    if (!data.email)
        throw new Error('Missing parameter.');

    const jwt = encode({
        email: data.email,
        expiresAt: Date.now() + 3600 * 1000
    });

    const link = `${process.env.APP_URL}/auth?token=${jwt}`;

    const email = {
        to: data.email,
        from: process.env.SENDGRID_SENDER,
        subject: 'Your password reset request',
        html: `
            Hi,<br><br>

            Click the following link to reset your password on Ethernal: <a href="${link}">${link}</a>.<br><br>

            If you haven't requested a password reset link, you can ignore this email.<br><br>

            - The Ethernal Team
        `
    };

    const res = await sgMail.send(email);

    if (res && res[0] && res[0].statusCode == 202)
        return true
    else
        throw new Error(res);
};
