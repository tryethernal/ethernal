const { StripeSubscription } = require('../models');
const { bulkEnqueue } = require('../lib/queue');

module.exports = async () => {
    const subscriptions = await StripeSubscription.findAll({
        where: { status: 'active' }
    });

    const jobs = subscriptions.map(s => ({
        name: `processStripeSubscription-${s.id}`,
        data: {
            stripeSubscriptionId: s.id,
            explorerId: s.explorerId
        }
    }));

    await bulkEnqueue('processStripeSubscription', jobs);

    return true;
};
