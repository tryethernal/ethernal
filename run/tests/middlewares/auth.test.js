require('../mocks/lib/firebase');
require('../mocks/models');
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

    describe('request-supplied uid', () => {
        const originalSecret = process.env.AUTH_SECRET;
        beforeEach(() => {
            res.status.mockClear();
            send.mockClear();
        });
        afterEach(() => {
            if (originalSecret === undefined)
                delete process.env.AUTH_SECRET;
            else
                process.env.AUTH_SECRET = originalSecret;
        });

        it('Should send a 401 if it has a uid and no token (AUTH_SECRET unset)', async () => {
            const next = jest.fn();
            delete process.env.AUTH_SECRET;

            const req = { headers: {}, body: { data: { uid: '123' } }, query: {} };

            await auth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(send).toHaveBeenCalledWith('You must be signed in to do this.');
            expect(next).not.toHaveBeenCalled();
        });

        it('Should send a 401 if it has a uid and no token (AUTH_SECRET set)', async () => {
            const next = jest.fn();
            process.env.AUTH_SECRET = 'secret';

            const req = { headers: {}, body: { data: { uid: '123', secret: 'secret' } }, query: {} };

            await auth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(send).toHaveBeenCalledWith('You must be signed in to do this.');
            expect(next).not.toHaveBeenCalled();
        });

        it('Should send a 401 if the uid is passed in the query string without a token', async () => {
            const next = jest.fn();
            delete process.env.AUTH_SECRET;

            const req = { headers: {}, body: {}, query: { uid: '123' } };

            await auth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('Should overwrite a request-supplied uid with the authenticated one (api token)', async () => {
            jest.spyOn(db, 'getUser').mockResolvedValue({ id: 1, apiKey: '123' });
            decode.mockReturnValue({ apiKey: '456', firebaseUserId: 'abc' });
            decrypt.mockReturnValue('456');
            const next = jest.fn();

            const req = { headers: { authorization: 'Bearer jwtToken' }, body: { data: { uid: 'victim', user: { id: 99 } } }, query: {} };

            await auth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(req.body.data.uid).toEqual('abc');
            expect(req.body.data.user).toEqual({ id: 1, apiKey: '123' });
        });

        it('Should overwrite a request-supplied uid with the authenticated one (firebase token)', async () => {
            jest.spyOn(db, 'getUser').mockResolvedValue({ id: 1, apiKey: '123' });
            getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue({ user_id: 'abc' }) });
            const next = jest.fn();

            const req = { headers: {}, body: { data: { uid: 'victim', firebaseAuthToken: 'token' } }, query: {} };

            await auth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(req.body.data.uid).toEqual('abc');
        });

        it('Should call next only once and return when req.user is already set', async () => {
            const next = jest.fn();

            const req = { user: { firebaseUserId: 'abc' }, headers: {}, body: { data: { uid: 'victim' } }, query: {} };

            await auth(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(req.body.data.uid).toEqual('abc');
        });
    });
});
