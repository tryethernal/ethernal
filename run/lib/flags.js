/**
 * @fileoverview Feature flags based on environment variables.
 * Provides boolean checks for optional features like Stripe, Pusher, Firebase auth.
 * @module lib/flags
 */

module.exports = {
    /** @returns {boolean} True if running in self-hosted mode */
    isSelfHosted: () => !!process.env.SELF_HOSTED,

    /** @returns {boolean} True if Pusher/Soketi is configured and enabled */
    isPusherEnabled: () => !!process.env.SOKETI_DEFAULT_APP_ID && !!process.env.SOKETI_DEFAULT_APP_KEY && !!process.env.SOKETI_DEFAULT_APP_SECRET && !!process.env.SOKETI_HOST && !!process.env.SOKETI_PORT,

    /** @returns {boolean} True if Stripe billing is configured */
    isStripeEnabled: () => !!(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY),

    /** @returns {boolean} True if Firebase authentication is enabled */
    isFirebaseAuthEnabled: () => !!process.env.ENABLE_FIREBASE_AUTH,

    /** @returns {boolean} True if Google API is configured */
    isGoogleApiEnabled: () => !!process.env.GOOGLE_API_KEY,

    /** @returns {boolean} True if Approximated SSL is configured */
    isApproximatedEnabled: () => !!(process.env.APPROXIMATED_API_KEY && process.env.APPROXIMATED_TARGET_IP),

    /** @returns {boolean} True if NODE_ENV is 'production' */
    isProductionEnvironment: () => process.env.NODE_ENV == 'production',

    /** @returns {boolean} True if NODE_ENV is 'development' */
    isDevelopmentEnvironment: () => process.env.NODE_ENV == 'development',

    /** @returns {boolean} True if demo mode is enabled */
    isDemoEnabled: () => !!process.env.DEMO_USER_ID,

    /** @returns {boolean} True if QuickNode integration is configured */
    isQuicknodeEnabled: () => !!process.env.QUICKNODE_CREDENTIALS,

    /** @returns {boolean} True if Mailjet email is configured */
    isMailjetEnabled: () => !!process.env.MAILJET_PUBLIC_KEY && !!process.env.MAILJET_PRIVATE_KEY,

    /** @returns {boolean} True if drip email campaign is configured */
    isDripEmailEnabled: () => !!process.env.MAILJET_PUBLIC_KEY && !!process.env.MAILJET_PRIVATE_KEY && !!process.env.DRIP_UNSUBSCRIBE_SECRET && !!process.env.DEMO_EXPLORER_SENDER,

    /** @returns {boolean} True if Sentry pipeline dashboard is enabled */
    isSentryPipelineEnabled: () => !!process.env.ENABLE_SENTRY_PIPELINE
};
