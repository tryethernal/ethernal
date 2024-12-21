require('../mocks/lib/queue');
const { Explorer } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

const removeExpiredExplorers = require('../../jobs/removeExpiredExplorers');

beforeEach(() => jest.clearAllMocks());

const safeDeleteSubscription = jest.fn();
const safeDelete = jest.fn();
const update = jest.fn();

describe('removeExpiredExplorers', () => {
    it('Should delete subscription, explorer, update workspace & enqueue ws reset & deletion', (done) => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-26'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-11-26'),
                safeDeleteSubscription,
                safeDelete,
                workspace: { update }
            },
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: { expiresAfter: 7 }}},
                createdAt: new Date('2023-12-25'),
                safeDeleteSubscription,
                safeDelete,
                workspace: { update }
            },
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123', stripePlan: { capabilities: {} }},
                safeDeleteSubscription,
                safeDelete,
                workspace: { update }
            }
        ]);

        removeExpiredExplorers()
            .then(res => {
                expect(update).toHaveBeenCalledWith({ pendingDeletion: true, public: false });
                expect(safeDelete).toHaveBeenNthCalledWith(1, { deleteSubscription: true });
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-1', {
                    workspaceId: 1,
                    from: new Date(0),
                    to: new Date()
                });
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-1', { workspaceId: 1 });
                expect(res).toEqual(['slug']);
                done();
            });
    });
});
