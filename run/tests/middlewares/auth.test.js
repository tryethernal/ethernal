require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
const auth = require('../../middlewares/auth');
const { getAuth } = require('firebase-admin/auth');

describe('authMiddleware', () => {
    const res = {
        status: jest.fn(() => ({
            send: jest.fn()
        }))
    };

    it('Should call next if not in production and has firebaseUserId', async () => {
        const next = jest.fn();
        let req = {
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
            body: {
                data: {
                    firebaseAuthToken: '123'
                }
            }
        };

        getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue(null) });

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should call next if it has a uid and a secret', async () => {
        const next = jest.fn();
        process.env.AUTH_SECRET = 'secret';

        let req = {
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

    it('Should send a 401 if secret', async () => {
        const next = jest.fn();
        process.env.AUTH_SECRET = 'secret';

        let req = {
            body: {
                data: {
                    uid: '123',
                    secret: 'invalid'
                }
            }
        };

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
