require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/mailjet');

const flags = require('../../lib/flags');

const sendDemoExplorerLink = require('../../jobs/sendDemoExplorerLink');

beforeEach(() => jest.clearAllMocks());

describe('sendDemoExplorerLink', () => {
    it('Should send a demo explorer link', (done) => {
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .then(() => {
                done();
            });
    });

    it('Should raise an error if Mailjet is not enabled', (done) => {
        jest.spyOn(flags, 'isMailjetEnabled').mockReturnValueOnce(false);
        sendDemoExplorerLink({ data: { email: 'antoine@tryethernal.com', explorerSlug: 'slug' }})
            .catch(error => {
                expect(error.message).toEqual('Mailjet has not been enabled.');
                done();
            });
    });
});
