jest.mock('../../../middlewares/secret', () => {
    return jest.fn((req, res, next) => next());
});
