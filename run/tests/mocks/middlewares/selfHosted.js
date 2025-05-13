jest.mock('../../../middlewares/selfHosted', () => {
    return (req, res, next) => {
        next();
    }
});
