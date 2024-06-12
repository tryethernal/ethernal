require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/lib/crypto');
const db = require('../../lib/firebase');
const browserSyncMiddleware = require('../../middlewares/browserSync');

beforeEach(() => jest.clearAllMocks());

describe('browserSyncMiddleware', () => {
    it('Should call next if browser sync is enabled & request comes from browser', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ browserSyncEnabled: true });
        const req = {
            body: {
                data: { uid: '123' }
            },
            query: { browserSync: true }
        };
        const res = {};
        const next = jest.fn();

        await browserSyncMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(db.updateBrowserSync).not.toHaveBeenCalled();
    });

    it('Should call next if browser sync is disabled & request does not come from browser', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ browserSyncEnabled: false });
        const req = {
            body: {
                data: { uid: '123' }
            },
            query: {}
        };
        const res = {};
        const next = jest.fn();

        await browserSyncMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(db.updateBrowserSync).not.toHaveBeenCalled();
    });

    it('Should return a 401 error if browser sync is disabled & request comes from browser', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ browserSyncEnabled: false });
        const send = jest.fn();
        const req = {
            body: {
                data: { uid: '123' }
            },
            query: { browserSync: true }
        };
        const res = {
            status: jest.fn(() => ({ send: send }))
        };
        const next = jest.fn();

        await browserSyncMiddleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Browser sync is not enabled.');
    });

    it('Should disable browser sync if it is enabled and request does not come from browser', async () => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ browserSyncEnabled: true, id: 1 });
        const req = {
            body: {
                data: { uid: '123' }
            },
            query: {}
        };
        const res = {};
        const next = jest.fn();
        await browserSyncMiddleware(req, res, next);

        expect(db.updateBrowserSync).toHaveBeenCalledWith(1, false);
        expect(next).toHaveBeenCalled();
    });
});
