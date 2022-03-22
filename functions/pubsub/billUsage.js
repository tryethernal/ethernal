const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { getUser } = require('../lib/firebase');

module.exports = async function(message) {
    try {
        const payload = message.json;

        const userId = payload.userId;
        const timestamp = payload.timestamp;

        const user = (await getUser(userId)).data();

        if (!user || !user.explorerSubscriptionId) return;

        await stripe.subscriptionItems.createUsageRecord(
            user.explorerSubscriptionId,
            {
                quantity: 1,
                timestamp: timestamp
            }
        )
    } catch(error) {
        console.log(error);
        return error;
    }
}
