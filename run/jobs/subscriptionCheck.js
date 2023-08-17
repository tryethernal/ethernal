const { StripeSubscription, Explorer } = require('../models');
const { bulkEnqueue } = require('../lib/queue');

module.exports = async () => {
    const subscriptions = await StripeSubscription.findAll({
        where: { status: 'active' },
        include: {
            model: Explorer,
            as: 'explorer',
            attributes: ['slug'],
            required: true
        }
    });

    const jobs = subscriptions.map(s => ({
        name: `processStripeSubscription-${s.id}`,
        data: {
            explorerSlug: s.explorer.slug
        }
    }));

    await bulkEnqueue('processStripeSubscription', jobs);

    return true;
};
