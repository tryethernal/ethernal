require('../mocks/lib/flags');
require('../mocks/lib/sendgrid');

const flags = require('../../lib/flags');
const sgMail = require('@sendgrid/mail');

const sendDemoExplorerLink = require('../../jobs/sendDemoExplorerLink');

beforeEach(() => jest.clearAllMocks());

describe('sendDemoExplorerLink', () => {
    it('Should send a demo explorer link', (done) => {
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .then(() => {
                expect(sgMail.send).toHaveBeenCalled();
                done();
            });
    });

    it('Should raise an error if Sendgrid is not enabled', (done) => {
        jest.spyOn(flags, 'isSendgridEnabled').mockReturnValueOnce(false);
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .catch(error => {
                expect(error.message).toEqual('Sendgrid has not been enabled.');
                done();
            });
    });
});
