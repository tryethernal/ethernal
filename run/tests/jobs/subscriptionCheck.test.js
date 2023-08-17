const { StripeSubscription } = require('../mocks/models');
require('../mocks/lib/queue');

const { bulkEnqueue } = require('../../lib/queue');
const subscriptionCheck = require('../../jobs/subscriptionCheck');

beforeEach(() => jest.clearAllMocks());

describe('subscriptionCheck', () => {
    it('Should enqueue subscriptions processing', async () => {
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            { explorer: { slug: 'slug-1' }},
            { explorer: { slug: 'slug-2' }}
        ]);

        await subscriptionCheck({});

        expect(bulkEnqueue).toHaveBeenCalledWith('processStripeSubscription', [
            { name: 'processStripeSubscription-slug-1', data: { explorerSlug: 'slug-1' }},
            { name: 'processStripeSubscription-slug-2', data: { explorerSlug: 'slug-2' }}
        ]);
    });
});
