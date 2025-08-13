require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/mailgun');

const flags = require('../../lib/flags');

const sendDemoExplorerLink = require('../../jobs/sendDemoExplorerLink');

beforeEach(() => jest.clearAllMocks());

describe('sendDemoExplorerLink', () => {
    it('Should send a demo explorer link', (done) => {
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .then(res => {
                expect(res).toEqual([{ statusCode: 202 }]);
                done();
            });
    });

    it('Should raise an error if Mailgun is not enabled', (done) => {
        jest.spyOn(flags, 'isMailgunEnabled').mockReturnValueOnce(false);
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .catch(error => {
                expect(error.message).toEqual('Mailgun has not been enabled.');
                done();
            });
    });
});
