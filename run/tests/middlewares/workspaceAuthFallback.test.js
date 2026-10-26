require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/utils');
require('../mocks/lib/crypto');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/logger');
jest.mock('../../lib/redis', () => ({
    get: jest.fn(),
    set: jest.fn()
}));

const workspaceAuth = require('../../middlewares/workspaceAuth');
const { getAuth } = require('firebase-admin/auth');
const db = require('../../lib/firebase');
const redis = require('../../lib/redis');
const { isSelfHosted } = require('../../lib/flags');
const { decode, decrypt } = require('../../lib/crypto');

const EXPLORER = {
    id: 5,
    name: 'My Chain',
    slug: 'mychain',
    stripeSubscription: { id: 1 },
    workspace: { id: 7, name: 'my-workspace', public: true },
    admin: { firebaseUserId: 'uid-admin' }
};
const WORKSPACE = { id: 7, name: 'my-workspace', public: true };

const makeRes = () => {
    const send = jest.fn();
    return { send, status: jest.fn(() => ({ send })), sendStatus: jest.fn() };
};

const makeReq = (overrides = {}) => ({
    method: 'GET',
    headers: { 'x-forwarded-host': 'mychain.ethernal.com' },
    body: {},
    query: {},
    ...overrides
});

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(db).forEach(fn => fn.mockReset());
    redis.get.mockReset().mockResolvedValue(null);
    redis.set.mockReset().mockResolvedValue('OK');
    isSelfHosted.mockReturnValue(false);
    db.getPublicExplorerParamsBySlug.mockResolvedValue(EXPLORER);
    db.getWorkspaceByNameAuth.mockResolvedValue(WORKSPACE);
});

describe('workspaceAuth host/apikey fallback', () => {
    it('Should serve a public explorer identified by its host', async () => {
        const req = makeReq();
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.workspace).toEqual(WORKSPACE);
        expect(req.query.firebaseUserId).toBe('uid-admin');
        expect(req.query.authenticated).toBe(false);
        expect(db.getWorkspaceByNameAuth).toHaveBeenCalledWith('uid-admin', 'my-workspace');
    });

    it('Should serve a public explorer identified by the apikey param', async () => {
        const req = makeReq({ headers: { host: 'app.ethernal.com' }, query: { apikey: 'mychain' } });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.workspace).toEqual(WORKSPACE);
        expect(req.query.authenticated).toBe(false);
    });

    it('Should treat an empty workspace param like a missing one', async () => {
        const req = makeReq({ query: { workspace: '' } });
        const next = jest.fn();

        await workspaceAuth(req, makeRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.workspace).toEqual(WORKSPACE);
    });

    it('Should keep other query params untouched', async () => {
        const req = makeReq({ query: { page: '2', itemsPerPage: '5' } });

        await workspaceAuth(req, makeRes(), jest.fn());

        expect(req.query.page).toBe('2');
        expect(req.query.itemsPerPage).toBe('5');
    });

    it('Should return 404 when the workspace turned private while the explorer was cached', async () => {
        redis.get.mockResolvedValue(JSON.stringify({ explorerId: 5, explorerName: 'My Chain', slug: 'mychain', workspaceId: 7, workspaceName: 'my-workspace', adminFirebaseUserId: 'uid-admin' }));
        db.getWorkspaceByNameAuth.mockResolvedValue({ ...WORKSPACE, public: false });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(), res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it('Should return 404 when the workspace was renamed or deleted while cached', async () => {
        redis.get.mockResolvedValue(JSON.stringify({ explorerId: 5, explorerName: 'My Chain', slug: 'mychain', workspaceId: 7, workspaceName: 'old-name', adminFirebaseUserId: 'uid-admin' }));
        db.getWorkspaceByNameAuth.mockResolvedValue(null);
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(), res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return 404 when the cached name now points to a different workspace', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ ...WORKSPACE, id: 99 });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(), res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should respond 401 Missing parameter when the explorer is not public', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue({ ...EXPLORER, workspace: { ...EXPLORER.workspace, public: false } });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
    });
});

describe('workspaceAuth backward compatibility', () => {
    it('Invariant 1: should behave as before when workspace and firebaseUserId are provided', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 3, name: 'My Workspace', public: true });
        const req = makeReq({ query: { workspace: 'My Workspace', firebaseUserId: 'abc' } });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(db.getWorkspaceByNameAuth).toHaveBeenCalledWith('abc', 'My Workspace');
        expect(req.query.workspace).toEqual({ id: 3, name: 'My Workspace', public: true });
        expect(req.query.firebaseUserId).toBe('abc');
        expect(req.query.authenticated).toBeFalsy();
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsByDomain).not.toHaveBeenCalled();
    });

    it('Invariant 1: should not consult the host when a workspace is provided, even if the host resolves', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue(null);
        const req = makeReq({ query: { workspace: 'Other', firebaseUserId: 'abc' } });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(req, res, next);

        expect(res.sendStatus).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it('Invariant 1: should behave as before with a JWT and a workspace', async () => {
        db.getUser.mockResolvedValue({ apiKey: '123' });
        decode.mockReturnValue({ apiKey: '456', firebaseUserId: 'abc' });
        decrypt.mockReturnValue('456');
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 3, name: 'My Workspace', public: false });
        const req = makeReq({ headers: { authorization: 'Bearer jwt' }, query: { workspace: 'My Workspace' } });
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.authenticated).toBe(true);
    });

    it('Invariant 1: should behave as before with a firebase auth token and a workspace', async () => {
        getAuth.mockReturnValueOnce({ verifyIdToken: jest.fn().mockResolvedValue({ user_id: 'abc' }) });
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 3, name: 'My Workspace', public: true });
        const req = makeReq({ query: { workspace: 'My Workspace', firebaseUserId: 'abc', firebaseAuthToken: 'token' } });
        const next = jest.fn();

        await workspaceAuth(req, makeRes(), next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.query.authenticated).toBe(true);
    });

    it('Invariant 2: should keep the 401 Missing parameter when the explorer does not resolve', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(null);
        db.getPublicExplorerParamsByDomain.mockResolvedValue(null);
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
    });

    it('Invariant 2: should keep the 401 when there is no host and no apikey', async () => {
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq({ headers: {} }), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
    });

    it.each([
        ['an Authorization header', { headers: { 'x-forwarded-host': 'mychain.ethernal.com', authorization: 'Bearer abc' } }],
        ['a firebaseUserId param', { query: { firebaseUserId: 'abc' } }],
        ['a firebaseAuthToken param', { query: { firebaseAuthToken: 'token' } }],
        ['a firebaseUserId in the body data', { body: { data: { firebaseUserId: 'abc' } } }]
    ])('Invariant 2: should not use the fallback when the request carries %s', async (_label, overrides) => {
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq(overrides), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it.each(['POST', 'PUT', 'DELETE', 'PATCH', undefined])('Invariant 3: should never use the fallback for %s requests', async (method) => {
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq({ method }), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith('Missing parameter');
        expect(next).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it('Invariant 3: should not use the fallback when the workspace is a non-empty falsy value', async () => {
        const res = makeRes();
        const next = jest.fn();

        await workspaceAuth(makeReq({ body: { workspace: 0 } }), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
