require('../mocks/lib/crypto');
require('../mocks/lib/flags');
require('../mocks/lib/sendgrid');

const flags = require('../../lib/flags');
const sgMail = require('@sendgrid/mail');

const sendResetPasswordEmail = require('../../jobs/sendResetPasswordEmail');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should send a reset password email', (done) => {
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .then(() => {
                expect(sgMail.send).toHaveBeenCalled();
                done();
            });
    });

    it('Should raise an error if Sendgrid is not enabled', (done) => {
        jest.spyOn(flags, 'isSendgridEnabled').mockReturnValueOnce(false);
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .catch(error => {
                expect(error.message).toEqual('Sendgrid has not been enabled.');
                done();
            });
    });
});
