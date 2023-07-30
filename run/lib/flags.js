module.exports = {
    isPusherEnabled: () => process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET,
    isStripeEnabled: () => process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY,
    isMarketingEnabled: () => process.env.ENABLE_MARKETING,
    isSendgridEnabled: () => process.env.SENDGRID_API_KEY && process.env.SENDGRID_SENDER,
    isFirebaseAuthEnabled: () => !!process.env.ENABLE_FIREBASE_AUTH,
    isGoogleApiEnabled: () => !!process.env.GOOGLE_API_KEY,
    isApproximatedEnabled: () => process.env.APPROXIMATED_API_KEY && process.env.APPROXIMATED_TARGET_IP
};
