require('../mocks/lib/queue');
const { Explorer } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

jest.mock('../../lib/analytics', () => {
    return jest.fn().mockImplementation(() => ({
        track: jest.fn(),
        shutdown: jest.fn()
    }));
});

const removeExpiredExplorers = require('../../jobs/removeExpiredExplorers');

beforeEach(() => jest.clearAllMocks());

const safeDelete = jest.fn();
const update = jest.fn();

describe('removeExpiredExplorers', () => {
    it('Should set grace period on first expiration (no deleteAfter yet)', async () => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-26'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-11-26'),
                safeDelete,
                workspace: { update, deleteAfter: null }
            }
        ]);

        const res = await removeExpiredExplorers();

        expect(update).toHaveBeenCalledWith({
            pendingDeletion: true,
            public: false,
            deleteAfter: new Date('2023-12-28')
        });
        expect(safeDelete).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
        expect(res).toEqual([]);

        jest.useRealTimers();
    });

    it('Should delete explorer after grace period has elapsed', async () => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-29'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-11-26'),
                safeDelete,
                workspace: { update, deleteAfter: new Date('2023-12-28'), userId: 42 }
            }
        ]);

        const res = await removeExpiredExplorers();

        expect(safeDelete).toHaveBeenCalledWith({ deleteSubscription: true });
        expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-1', {
            workspaceId: 1,
            from: new Date(0),
            to: new Date()
        });
        expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-1', { workspaceId: 1 });
        expect(res).toEqual(['slug']);

        jest.useRealTimers();
    });

    it('Should skip explorer still in grace period', async () => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-27'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-11-26'),
                safeDelete,
                workspace: { update, deleteAfter: new Date('2023-12-28') }
            }
        ]);

        const res = await removeExpiredExplorers();

        expect(safeDelete).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
        expect(res).toEqual([]);

        jest.useRealTimers();
    });

    it('Should skip explorer not yet expired', async () => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-26'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-12-25'),
                safeDelete,
                workspace: { update, deleteAfter: null }
            }
        ]);

        const res = await removeExpiredExplorers();

        expect(safeDelete).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
        expect(res).toEqual([]);

        jest.useRealTimers();
    });
});
