module.exports = {
    getAppDomain: () => process.env.APP_DOMAIN,
    getDefaultPlanSlug: () => process.env.DEFAULT_PLAN_SLUG,
    getAppUrl: () => process.env.APP_URL,
    getScannerKey: (scanner) => process.env[`${scanner}_API_TOKEN`]
};
