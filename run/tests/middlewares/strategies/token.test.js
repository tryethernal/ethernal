require('../../mocks/lib/firebase');
require('../../mocks/models');
require('../../mocks/lib/firebase-admin');
require('../../mocks/lib/crypto');

const { getAuth } = require('firebase-admin/auth');
const { decode, decrypt } = require('../../../lib/crypto');
const db = require('../../../lib/firebase');

const strategy = require('../../../middlewares/strategies/token');

describe('strategy', () => {
    it('Should return success callback if api token is valid', async () => {
        const cb = jest.fn();
        const req = {
            query: {},
            body: {},
            headers: {
                'authorization': 'Bearer token'
            }
        };
        decode.mockReturnValueOnce({ firebaseUserId: 1, apiKey: 'ok' });
        decrypt.mockReturnValueOnce('ok');
        jest.spyOn(db, 'getUser').mockResolvedValue({ id: 1, apiKey: 'ok' });
        
        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, { id: 1, apiKey: 'ok' });
    });

    it('Should return failed callback if user is not found', async () => {
        const cb = jest.fn();
        const req = {
            query: {},
            body: {},
            headers: {
                'authorization': 'Bearer token'
            }
        };
        decode.mockReturnValueOnce({ firebaseUserId: 1, apiKey: 'ok' });
        jest.spyOn(db, 'getUser').mockResolvedValue(null);
        
        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid authorization header.' });
    });

    it('Should return failed callback if api token is not valid', async () => {
        const cb = jest.fn();
        const req = {
            query: {},
            body: {},
            headers: {
                'authorization': 'Bearer token'
            }
        };
        decode.mockReturnValueOnce({ firebaseUserId: 1, apiKey: 'ko' });
        decrypt.mockReturnValueOnce('ok');
        jest.spyOn(db, 'getUser').mockResolvedValue({ id: 1, apiKey: 'ok' });
        
        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid authorization header.' });
    });

    it('Should return failed callback if auth header has invalid format', async () => {
        const cb = jest.fn();
        const req = {
            query: {},
            body: {},
            headers: {
                'authorization': 'token'
            }
        };
        
        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid authorization header.' });
    });

    it('Should return failed callback if firebase auth token is invalid', async () => {
        const cb = jest.fn();
        const req = {
            query: {
                firebaseAuthToken: 'token'
            },
            body: {},
            headers: {}
        };
        getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue(null) });

        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid authentication token.' });
    });

    it('Should return success callback if firebase auth token is valid', async () => {
        const cb = jest.fn();
        const req = {
            query: {
                firebaseAuthToken: 'token'
            },
            body: {},
            headers: {}
        };
        jest.spyOn(db, 'getUser').mockResolvedValue({ id: 1 });
        getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue({ user_id: '123' })});

        await strategy(req, cb);
        expect(cb).toHaveBeenCalledWith(null, { id: 1 });
    });
});
