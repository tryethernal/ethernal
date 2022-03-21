const Helper = require('../helper');
jest.mock('stripe', () => {
    const stripeMock = {
        subscriptionItems: {
            createUsageRecord: jest.fn().mockResolvedValue(true)
        }
    };
    return () => stripeMock;
})
const stripe = require('stripe')();
jest.mock('../../lib/firebase', () => ({
    getUser: jest.fn()
}));
const { getUser } = require('../../lib/firebase');
const billUsage = require('../../pubsub/billUsage');

describe('billUsage', () => {
    beforeEach(()=> {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        jest.clearAllMocks();
    });

    it('Should create a record in Stripe if the user has an explorer subscription', async () => {
        getUser.mockResolvedValue({ data: () => ({ explorerSubscriptionId: 'si_1234' }) });

        const message = {
            json: {
                userId: '123',
                timestamp: 123
            }
        };
        const result = await billUsage(message);
        
        expect(stripe.subscriptionItems.createUsageRecord).toHaveBeenCalledWith('si_1234', { quantity: 1, timestamp: 123 });
    });

    it('Should not create a record in Stripe if the user has not an explorer subscription', async () => {
        getUser.mockResolvedValue({ data: () => ({ apiKey: '1234' })})

        const message = {
            json: {
                userId: '123',
                timestamp: 123
            }
        };
        const result = await billUsage(message);

        expect(stripe.subscriptionItems.createUsageRecord).not.toHaveBeenCalled();
    });
});
