require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/queue');

jest.mock('../../lib/firebase', () => ({
    getPendingDripEmails: jest.fn(),
    skipDripEmailsForExplorer: jest.fn()
}));

const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');

const processDripEmails = require('../../jobs/processDripEmails');

beforeEach(() => jest.clearAllMocks());

describe('processDripEmails', () => {
    it('Should skip emails for explorers that migrated (isDemo=false)', async () => {
        db.getPendingDripEmails.mockResolvedValue([{
            id: 1,
            explorerId: 10,
            email: 'dev@example.com',
            step: 2,
            explorer: {
                id: 10,
                slug: 'my-chain',
                isDemo: false,
                workspace: { id: 5 }
            }
        }]);
        db.skipDripEmailsForExplorer.mockResolvedValue(3);

        await processDripEmails();

        expect(db.skipDripEmailsForExplorer).toHaveBeenCalledWith(10);
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('Should enqueue sendDripEmail for pending emails', async () => {
        db.getPendingDripEmails.mockResolvedValue([{
            id: 1,
            explorerId: 10,
            email: 'dev@example.com',
            step: 2,
            explorer: {
                id: 10,
                slug: 'my-chain',
                isDemo: true,
                workspace: { id: 5 }
            }
        }]);

        await processDripEmails();

        expect(enqueue).toHaveBeenCalledWith(
            'sendDripEmail',
            'sendDripEmail-1',
            expect.objectContaining({ scheduleId: 1, email: 'dev@example.com', step: 2, explorerSlug: 'my-chain' }),
            1
        );
    });

    it('Should do nothing when no pending emails', async () => {
        db.getPendingDripEmails.mockResolvedValue([]);
        await processDripEmails();
        expect(enqueue).not.toHaveBeenCalled();
    });
});
