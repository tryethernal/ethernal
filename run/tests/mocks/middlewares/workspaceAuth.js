require('../lib/firebase');
jest.mock('../../../middlewares/workspaceAuth', () => {
    return jest.fn((req, res, next) => {
        req.query.firebaseUserId = '123';
        req.query.workspace = { id: 1, name: 'My Workspace' }
        next();
    })
});
