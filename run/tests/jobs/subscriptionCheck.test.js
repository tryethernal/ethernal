const { StripeSubscription } = require('../mocks/models');
require('../mocks/lib/queue');

const { bulkEnqueue } = require('../../lib/queue');
const subscriptionCheck = require('../../jobs/subscriptionCheck');

beforeEach(() => jest.clearAllMocks());

describe('subscriptionCheck', () => {
    it('Should enqueue subscriptions processing', async () => {
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            { id: 1, explorerId: 1 },
            { id: 2, explorerId: 2 }
        ]);

        await subscriptionCheck({});

        expect(bulkEnqueue).toHaveBeenCalledWith('processStripeSubscription', [
            { name: 'processStripeSubscription-1', data: { stripeSubscriptionId: 1, explorerId: 1 }},
            { name: 'processStripeSubscription-2', data: { stripeSubscriptionId: 2, explorerId: 2 }}
        ]);
    });
});
