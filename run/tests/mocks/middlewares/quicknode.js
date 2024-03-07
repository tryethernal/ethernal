jest.mock('../../../middlewares/quicknode', () => {
    return (req, res, next) => {
        next();
    }
});
