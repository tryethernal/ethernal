require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
const workspaceAuth = require('../../middlewares/workspaceAuth');
const { getAuth } = require('firebase-admin/auth');
const db = require('../../lib/firebase');

describe('workspaceAuth', () => {
    let res = {
        status: jest.fn(() => ({
            send: jest.fn(),
        })),
        sendStatus: jest.fn()
    }

    it('Should return a 401 if no firebaseUserId', async () => {
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseUserId: null,
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return a 401 if no workspace', async () => {
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseUserId: '123',
                workspace: null
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should not need auth if not in production', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace' });
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseUserId: '123',
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('Should return 400 if workspace does not exist', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue(null);
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseUserId: '123',
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(400);
    });

    it('Should return 404 if workspace is not public and external user wants to access', async () => {
        process.env.NODE_ENV = 'production';
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: false });
        getAuth.mockReturnValueOnce({
            verifyIdToken: jest.fn().mockResolvedValue({ user_id: '456' })
        });
        
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseAuthToken: '123',
                firebaseUserId: '123',
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
    });

    it('Should allow access if workspace is public and external user wants to access', async () => {
        process.env.NODE_ENV = 'production';
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: true });
        getAuth.mockReturnValueOnce({
            verifyIdToken: jest.fn().mockResolvedValue({ user_id: '456' })
        });
        
        const next = jest.fn();
        const req = {
            body: {},
            query: {
                firebaseAuthToken: '123',
                firebaseUserId: '123',
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});