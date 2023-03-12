require('../mocks/lib/firebase');
require('../mocks/lib/crypto');

const passportLocalStrategy = require('../../middlewares/passportLocalStrategy');

describe('passportLocalStrategy', () => {
    const send = jest.fn();
    const res = {
        status: jest.fn(() => ({
            send: send
        }))
    };

    it.only('Should allow access if email/password is valid', async () => {
        const next = jest.fn();
        jest.mock('passport', () => ({
            authenticate: jest.fn((strategy, options, cb) => cb(null, { id: 1 }, null)).mockResolvedValue()
        }));

        const req = {
            headers: {},
            body: {
                email: 'antoine@tryethernal.com',
                password: 'password'
            },
            query: {},
        };

        await passportLocalStrategy(req, res, next);
        expect(next).toHaveBeenCalled();
        // If someone knows how to check that next has been called...please help...otherwise we'll just assume that if no error raised, then it worked
    });


    it('Should allow access if email/password is valid', () => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValue(null);
        const next = jest.fn();
        const req = {
            headers: {},
            body: {
                email: 'antoine@tryethernal.com',
                password: 'password'
            },
            query: {},
            logIn: jest.fn()
        };

        passportLocalStrategy(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('Invalid email or password.');
    });
});