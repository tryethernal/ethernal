jest.mock('../../../middlewares/sentryDashboardAuth', () => {
    return jest.fn((req, res, next) => {
        next();
    })
});
