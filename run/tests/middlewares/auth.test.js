require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/crypto');
const auth = require('../../middlewares/auth');
const db = require('../../lib/firebase');
const { getAuth } = require('firebase-admin/auth');
const { decode, decrypt } = require('../../lib/crypto');

describe('authMiddleware', () => {
    const send = jest.fn();
    const res = {
        status: jest.fn(() => ({
            send: send
        }))
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

        await auth(req, res, next);

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

        await auth(req, res, next);

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

        await auth(req, res, next);

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

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid authorization header');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should call next if not in production and has firebaseUserId', async () => {
        const next = jest.fn();
        let req = {
            headers: {},
            body: {
                data: {
                    firebaseUserId: '123'
                }
            }
        };

        await auth(req, res, next);

        expect(req.body.data.uid).toEqual('123');
        expect(next).toHaveBeenCalled();
    });

    it('Should send a 401 if auth token is invalid', async () => {
        const next = jest.fn();
        let req = {
            headers: {},
            body: {
                data: {
                    firebaseAuthToken: '123'
                }
            }
        };

        getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue(null) });

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('You must be signed in to do this.');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should call next if it has a uid and a secret', async () => {
        const next = jest.fn();
        process.env.AUTH_SECRET = 'secret';

        let req = {
            headers: {},
            body: {
                data: {
                    uid: '123',
                    secret: 'secret'
                }
            }
        };

        await auth(req, res, next);

        expect(req.body.data.uid).toEqual('123');
        expect(req.body.data.secret).toBe(undefined);
        expect(next).toHaveBeenCalled();
    });

    it('Should send a 401 if secret is invalid', async () => {
        const next = jest.fn();
        process.env.AUTH_SECRET = 'secret';

        let req = {
            headers: {},
            body: {
                data: {
                    uid: '123',
                    secret: 'invalid'
                }
            }
        };

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('You must be signed in to do this.');
        expect(next).not.toHaveBeenCalled();
    });
});
