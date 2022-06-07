jest.mock('../../../middlewares/auth', () => {
    return (req, res, next) => {
        req.body.data.uid = '123';
        next();
    }
});
