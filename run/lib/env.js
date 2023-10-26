module.exports = {
    getAppDomain: () => process.env.APP_DOMAIN,
    getDefaultPlanSlug: () => process.env.DEFAULT_PLAN_SLUG,
    getAppUrl: () => process.env.APP_URL,
    getScannerKey: (scanner) => process.env[`${scanner}_API_TOKEN`],
    getNodeEnv: () => process.env.NODE_ENV,
    getGhostApiKey: () => process.env.GHOST_API_KEY,
    getGhostEndpoint: () => process.env.GHOST_ENDPOINT,
    getMixpanelApiToken: () => process.env.MIXPANEL_API_TOKEN,
    getPm2Host: () => process.env.PM2_HOST,
    getPm2Secret: () => process.env.PM2_SECRET,
    getDemoUserId: () => process.env.DEMO_USER_ID,
    getDemoTrialSlug: () => process.env.DEMO_TRIAL_SLUG,
    getStripeSecretKey: () => process.env.STRIPE_SECRET_KEY
};
