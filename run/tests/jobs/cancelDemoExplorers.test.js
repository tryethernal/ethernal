require('../mocks/lib/queue');
const { Explorer } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

const cancelDemoExplorers = require('../../jobs/cancelDemoExplorers');

beforeEach(() => jest.clearAllMocks());

const safeDeleteSubscription = jest.fn();

describe('cancelDemoExplorers', () => {
    it('Should delete subscription & enqueue syncing process update', (done) => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            {
                slug: 'slug',
                stripeSubscription: { stripeId: '123' },
                safeDeleteSubscription
            }
        ]);

        cancelDemoExplorers()
            .then(res => {
                expect(safeDeleteSubscription).toHaveBeenCalledWith('123');
                expect(enqueue).toBeCalledWith('updateExplorerSyncingProcess', 'updateExplorerSyncingProcess-slug', {
                    explorerSlug: 'slug'
                });
                expect(res).toEqual(['slug']);
                done();
            });
    });
});
