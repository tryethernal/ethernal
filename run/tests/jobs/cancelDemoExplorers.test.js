require('../mocks/lib/queue');
const { Explorer } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

const cancelDemoExplorers = require('../../jobs/cancelDemoExplorers');

beforeEach(() => jest.clearAllMocks());

const safeDeleteSubscription = jest.fn();
const safeDelete = jest.fn();
const update = jest.fn();

describe('cancelDemoExplorers', () => {
    it('Should delete subscription, explorer, update workspace & enqueue ws reset & deletion', (done) => {
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-26'));

        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                workspaceId: 1,
                slug: 'slug',
                stripeSubscription: { stripeId: '123' },
                safeDeleteSubscription,
                safeDelete,
                workspace: { update }
            }
        ]);

        cancelDemoExplorers()
            .then(res => {
                expect(safeDeleteSubscription).toHaveBeenCalledWith('123');
                expect(safeDelete).toHaveBeenCalled();
                expect(update).toHaveBeenCalledWith({ pendingDeletion: true, public: false });
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
