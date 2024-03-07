require('../mocks/lib/flags');
require('../mocks/lib/env');
const quicknodeMiddleware = require('../../middlewares/quicknode');
const flags = require('../../lib/flags');
const env = require('../../lib/env');

beforeEach(() => jest.clearAllMocks());

describe('quicknodeMiddleware', () => {
    it('Should send 404 if quicknode is not enabled', async () => {
        jest.spyOn(flags, 'isQuicknodeEnabled').mockReturnValueOnce(false);
        const sendStatus = jest.fn();
        const res = { sendStatus };

        await quicknodeMiddleware({}, res, jest.fn());
        expect(sendStatus).toHaveBeenCalledWith(404);
    });

    it('Should send 401 if no auth header', async () => {
        jest.spyOn(flags, 'isQuicknodeEnabled').mockReturnValueOnce(true);
        const sendStatus = jest.fn();
        const res = { sendStatus };

        await quicknodeMiddleware({ headers: {}}, res, jest.fn());
        expect(sendStatus).toHaveBeenCalledWith(401);
    });

    it('Should pass if valid auth header', async () => {
        jest.spyOn(flags, 'isQuicknodeEnabled').mockReturnValueOnce(true);
        const sendStatus = jest.fn();
        const res = { sendStatus };
        const req = {
            headers: { authorization: 'Basic qn' }
        };
        const next = jest.fn();

        await quicknodeMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
