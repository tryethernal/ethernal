require('../../mocks/lib/firebase');
require('../../mocks/lib/crypto');

const { firebaseVerify } = require('../../../lib/crypto');
const db = require('../../../lib/firebase');

const strategy = require('../../../middlewares/strategies/local');

describe('strategy', () => {
    it('Should return success callback if email/password is valid', async () => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValue({ id: 1 });
        const cb = jest.fn();

        await strategy('antoine@tryethernal.com', 'password', cb);
        expect(cb).toHaveBeenCalledWith(null, { id : 1 });
    });

    it('Should return failed callback if user is not found', async () => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValue(null);
        const cb = jest.fn();

        await strategy('antoine@tryethernal.com', 'password', cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid email or password.' });
    });

    it('Should return failed callback if email/password is not valid', async () => {
        jest.spyOn(db, 'getUserByEmail').mockResolvedValue({ id: 1 });
        firebaseVerify.mockReturnValueOnce(false);
        const cb = jest.fn();

        await strategy('antoine@tryethernal.com', 'password', cb);
        expect(cb).toHaveBeenCalledWith(null, false, { message: 'Invalid email or password.' });
    });
});