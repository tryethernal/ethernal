require('../mocks/lib/crypto');
require('../mocks/lib/flags');
require('../mocks/lib/mailjet');

const flags = require('../../lib/flags');

const sendResetPasswordEmail = require('../../jobs/sendResetPasswordEmail');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should send a reset password email', (done) => {
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .then(res => {
                done();
            });
    });

    it('Should raise an error if Mailjet is not enabled', (done) => {
        jest.spyOn(flags, 'isMailjetEnabled').mockReturnValueOnce(false);
        sendResetPasswordEmail({ data: { email: 'antoine@tryethernal.com' }})
            .catch(error => {
                expect(error.message).toEqual('Mailjet has not been enabled.');
                done();
            });
    });
});
