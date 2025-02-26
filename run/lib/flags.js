module.exports = {
    isPusherEnabled: () => !!process.env.SOKETI_DEFAULT_APP_ID && !!process.env.SOKETI_DEFAULT_APP_KEY && !!process.env.SOKETI_DEFAULT_APP_SECRET && !!process.env.SOKETI_HOST && !!process.env.SOKETI_PORT,
    isStripeEnabled: () => process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY,
    isMarketingEnabled: () => true,
    isSendgridEnabled: () => process.env.SENDGRID_API_KEY && process.env.SENDGRID_SENDER,
    isFirebaseAuthEnabled: () => !!process.env.ENABLE_FIREBASE_AUTH,
    isGoogleApiEnabled: () => !!process.env.GOOGLE_API_KEY,
    isApproximatedEnabled: () => process.env.APPROXIMATED_API_KEY && process.env.APPROXIMATED_TARGET_IP,
    isProductionEnvironment: () => process.env.NODE_ENV == 'production',
    isDevelopmentEnvironment: () => process.env.NODE_ENV == 'development',
    isDemoEnabled: () => !!process.env.DEMO_USER_ID,
    isQuicknodeEnabled: () => !!process.env.QUICKNODE_CREDENTIALS
};
