const secret = require('../../middlewares/secret');

describe('authMiddleware', () => {
    process.env.SECRET = '123';
    const send = jest.fn();
    const res = {
        status: jest.fn(() => ({
            send: send
        }))
    };

    it('Should allow access when using the right secret', async () => {
        const next = jest.fn();
        const req = {
            query: {
                secret: '123'
            }
        };

        await secret(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('Should throw an error if using wrong secret', async () => {
        const next = jest.fn();
        const req = {
            query: {
                secret: '1234'
            }
        };

        await secret(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith(new Error('Invalid secret'));
        expect(next).not.toHaveBeenCalled();
    });
});
