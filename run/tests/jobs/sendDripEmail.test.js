require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/mailjet');

jest.mock('../../lib/firebase', () => ({
    markDripEmailSent: jest.fn()
}));

jest.mock('../../lib/analytics', () => {
    return jest.fn().mockImplementation(() => ({
        track: jest.fn(),
        shutdown: jest.fn()
    }));
});

const flags = require('../../lib/flags');
const Mailjet = require('node-mailjet');
const db = require('../../lib/firebase');
const Analytics = require('../../lib/analytics');

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

        const analyticsInstance = Analytics.mock.results[0].value;
        expect(analyticsInstance.track).toHaveBeenCalledWith(
            'explorer:my-chain',
            'email:drip_sent',
            { step: 2, explorerSlug: 'my-chain' }
        );
        expect(analyticsInstance.shutdown).toHaveBeenCalled();
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
