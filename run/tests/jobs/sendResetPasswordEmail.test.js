require('../mocks/lib/crypto');
require('../mocks/lib/flags');
require('../mocks/lib/mailgun');

const flags = require('../../lib/flags');

const sendResetPasswordEmail = require('../../jobs/sendResetPasswordEmail');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should send a reset password email', (done) => {
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .then(res => {
                expect(res).toEqual([{ statusCode: 202 }]);
                done();
            });
    });

    it('Should raise an error if Mailgun is not enabled', (done) => {
        jest.spyOn(flags, 'isMailgunEnabled').mockReturnValueOnce(false);
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .catch(error => {
                expect(error.message).toEqual('Mailgun has not been enabled.');
                done();
            });
    });
});
