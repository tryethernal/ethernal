jest.mock('../../../middlewares/browserSync', () => {
    return (req, res, next) => {
        next();
    }
});
