require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/mailjet');

jest.mock('../../lib/firebase', () => ({
    markDripEmailSent: jest.fn()
}));

const flags = require('../../lib/flags');
const Mailjet = require('node-mailjet');
const db = require('../../lib/firebase');

const sendDripEmail = require('../../jobs/sendDripEmail');

beforeEach(() => jest.clearAllMocks());

describe('sendDripEmail', () => {
    it('Should send a drip email for step 2', async () => {
        db.markDripEmailSent.mockResolvedValue();

        await sendDripEmail({ data: {
            email: 'dev@example.com',
            explorerSlug: 'my-chain',
            step: 2,
            activitySummary: '12 token transfers',
            scheduleId: 1
        }});

        const mailjetInstance = Mailjet.apiConnect();
        const postFn = mailjetInstance.post;
        expect(postFn).toHaveBeenCalledWith('send', { version: 'v3.1' });
        expect(db.markDripEmailSent).toHaveBeenCalledWith(1);
    });

    it('Should throw if Mailjet is not enabled', async () => {
        jest.spyOn(flags, 'isMailjetEnabled').mockReturnValueOnce(false);
        await expect(sendDripEmail({ data: {
            email: 'dev@example.com',
            explorerSlug: 'my-chain',
            step: 1
        }})).rejects.toThrow('Mailjet has not been enabled');
    });
});
