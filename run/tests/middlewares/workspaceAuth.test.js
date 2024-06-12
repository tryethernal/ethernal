require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/utils');
require('../mocks/lib/crypto');
const workspaceAuth = require('../../middlewares/workspaceAuth');
const { getAuth } = require('firebase-admin/auth');
const db = require('../../lib/firebase');
const { getEnv } = require('../../lib/utils');
const { decode, decrypt } = require('../../lib/crypto');

describe('workspaceAuth', () => {
    const send = jest.fn();
    let res = {
        status: jest.fn(() => ({
            send: send,
        })),
        sendStatus: jest.fn()
    };

    it('Should allow access when using valid api token', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUser').mockResolvedValue({ apiKey: '123' });
        decode.mockReturnValue({ apiKey: '456', firebaseUserId: 'abc'});
        decrypt.mockReturnValue('456');
        
        const next = jest.fn();
        const req = {
            headers: {
                authorization: 'Bearer jwtToken'
            },
            body: {},
            query: {
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('Should reject access if api token does not contain user', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUser').mockResolvedValue(null);
        decode.mockReturnValue({ apiKey: '456', firebaseUserId: 'abc'});
        
        const next = jest.fn();
        const req = {
            headers: {
                authorization: 'Bearer jwtToken'
            },
            body: {},
            query: {
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid firebaseUserId');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should reject access if api token does not contain the right api key', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: true });
        jest.spyOn(db, 'getUser').mockResolvedValue({ apiKey: '123' });
        decode.mockReturnValue({ apiKey: '456', firebaseUserId: 'abc'});
        decrypt.mockReturnValue('yui');
        
        const next = jest.fn();
        const req = {
            headers: {
                authorization: 'Bearer jwtToken'
            },
            body: {},
            query: {
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid authorization header');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should reject access if auth header has invalid format', async () => {
        const next = jest.fn();
        const req = {
            headers: {
                authorization: 'jwtToken'
            },
            body: {},
            query: {
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid authorization header');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return a 401 if no firebaseUserId & no auth header', async () => {
        getEnv.mockReturnValueOnce('production');
        const next = jest.fn();
        const req = {
            headers: {},
            body: {},
            query: {
                firebaseUserId: null,
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return a 401 if auth is good but no workspace', async () => {
        const next = jest.fn();
        const req = {
            headers: {},
            body: {},
            query: {
                firebaseUserId: '123',
                workspace: null
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return 404 if workspace does not exist', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue(null);
        const next = jest.fn();
        const req = {
            headers: {},
            body: {},
            query: {
                firebaseUserId: '123',
                workspace: 'My Workspace'
            }
        };

        await workspaceAuth(req, res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
    });

    it('Should return 404 if workspace is not public and external user wants to access', async () => {
        process.env.NODE_ENV = 'production';
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ name: 'My Workspace', public: false });
        getAuth.mockReturnValueOnce({
            verifyIdToken: jest.fn().mockResolvedValue({ user_id: '456' })
        });

        const next = jest.fn();
        const req = {
            headers: {},
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
            headers: {},
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