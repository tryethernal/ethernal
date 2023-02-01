module.exports = {
    isPusherEnabled: process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET,
    isStripeEnabled: process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY,
    isMarketingEnabled: !!process.env.ENABLE_MARKETING
};
