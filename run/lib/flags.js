module.exports = {
    isPusherEnabled: process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET,
    isStripeEnabled: process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY,
    isMarketingEnabled: process.env.ENABLE_MARKETING,
    isSendgridEnabled: () => process.env.SENDGRID_API_KEY && process.env.SENDGRID_SENDER,
    isFirebaseAuthEnabled: () => process.env.FIREBASE_SIGNER_KEY && process.env.FIREBASE_SALT_SEPARATOR && process.env.FIREBASE_ROUNDS && process.env.FIREBASE_MEM_COST
};
