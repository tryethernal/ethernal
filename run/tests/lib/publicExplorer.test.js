/**
 * @fileoverview Tests for public explorer resolution by host or slug, host normalisation, caching, and the public workspace loader.
 */

require('../mocks/models');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/logger');
require('../mocks/lib/firebase');
require('../mocks/lib/utils');
jest.mock('../../lib/redis', () => ({
    get: jest.fn(),
    set: jest.fn()
}));

const db = require('../../lib/firebase');
const redis = require('../../lib/redis');
const { isSelfHosted } = require('../../lib/flags');
const { normaliseHost, resolvePublicExplorer, loadPublicWorkspace, resolveExplorerParamsFallback } = require('../../lib/publicExplorer');

const explorer = (overrides = {}) => ({
    id: 5,
    name: 'My Chain',
    slug: 'mychain',
    stripeSubscription: { id: 1 },
    workspace: { id: 7, name: 'my-workspace', public: true },
    admin: { firebaseUserId: 'uid-1' },
    ...overrides
});

const RESOLVED = {
    explorerId: 5,
    explorerName: 'My Chain',
    slug: 'mychain',
    workspaceId: 7,
    workspaceName: 'my-workspace',
    adminFirebaseUserId: 'uid-1'
};

const req = (host, extra = {}) => ({ headers: { host, ...extra.headers }, query: extra.query || {}, body: extra.body || {} });

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(db).forEach(fn => fn.mockReset());
    redis.get.mockReset();
    redis.set.mockReset();
    isSelfHosted.mockReturnValue(false);
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
});

describe('normaliseHost', () => {
    it('Should prefer x-forwarded-host over host', () => {
        expect(normaliseHost({ headers: { 'x-forwarded-host': 'a.example.com', host: 'b.example.com' } })).toBe('a.example.com');
    });

    it('Should fall back to host', () => {
        expect(normaliseHost({ headers: { host: 'b.example.com' } })).toBe('b.example.com');
    });

    it('Should use the first entry of a comma separated list, trimmed and lowercased', () => {
        expect(normaliseHost({ headers: { 'x-forwarded-host': ' Foo.Example.COM , bar.example.com' } })).toBe('foo.example.com');
    });

    it('Should strip the port and one trailing dot', () => {
        expect(normaliseHost({ headers: { host: 'foo.example.com:8080' } })).toBe('foo.example.com');
        expect(normaliseHost({ headers: { host: 'foo.example.com.' } })).toBe('foo.example.com');
        expect(normaliseHost({ headers: { host: 'foo.example.com.:443' } })).toBe('foo.example.com');
        expect(normaliseHost({ headers: { host: 'foo.example.com..' } })).toBe('foo.example.com.');
    });

    it('Should reject empty, invalid and too long hosts', () => {
        expect(normaliseHost({ headers: {} })).toBeNull();
        expect(normaliseHost({ headers: { host: '' } })).toBeNull();
        expect(normaliseHost({ headers: { host: 'foo_bar.example.com' } })).toBeNull();
        expect(normaliseHost({ headers: { host: 'foo.example.com/path' } })).toBeNull();
        expect(normaliseHost({ headers: { host: '[::1]:8080' } })).toBeNull();
        expect(normaliseHost({ headers: { host: `${'a'.repeat(254)}` } })).toBeNull();
        expect(normaliseHost({})).toBeNull();
    });
});

describe('resolvePublicExplorer', () => {
    it('Should resolve a <slug>.APP_DOMAIN host by slug', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('mychain.ethernal.com'));

        expect(result).toEqual({ via: 'host', ...RESOLVED });
        expect(db.getPublicExplorerParamsBySlug).toHaveBeenCalledWith('mychain');
        expect(db.getPublicExplorerParamsByDomain).not.toHaveBeenCalled();
    });

    it('Should honour x-forwarded-host with a port and different case', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer({ headers: { 'x-forwarded-host': 'MyChain.Ethernal.com:443', host: 'internal' }, query: {} });

        expect(result.via).toBe('host');
        expect(db.getPublicExplorerParamsBySlug).toHaveBeenCalledWith('mychain');
    });

    it('Should fall back to a custom domain lookup when the slug is unknown', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(null);
        db.getPublicExplorerParamsByDomain.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('custom.ethernal.com'));

        expect(result).toEqual({ via: 'host', ...RESOLVED });
        expect(db.getPublicExplorerParamsByDomain).toHaveBeenCalledWith('custom.ethernal.com');
    });

    it('Should only look up a custom domain for multi-label subdomains of APP_DOMAIN', async () => {
        db.getPublicExplorerParamsByDomain.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('a.b.ethernal.com'));

        expect(result.via).toBe('host');
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsByDomain).toHaveBeenCalledWith('a.b.ethernal.com');
    });

    it('Should look up custom domains directly', async () => {
        db.getPublicExplorerParamsByDomain.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('explorer.example.org'));

        expect(result).toEqual({ via: 'host', ...RESOLVED });
        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it('Should not resolve the reserved hosts by host', async () => {
        for (const host of ['ethernal.com', 'www.ethernal.com', 'app.ethernal.com'])
            expect(await resolvePublicExplorer(req(host))).toBeNull();

        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
        expect(db.getPublicExplorerParamsByDomain).not.toHaveBeenCalled();
    });

    it('Should treat app.APP_DOMAIN as a slug when self-hosted', async () => {
        isSelfHosted.mockReturnValue(true);
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer({ slug: 'app' }));

        const result = await resolvePublicExplorer(req('app.ethernal.com'));

        expect(result.via).toBe('host');
        expect(db.getPublicExplorerParamsBySlug).toHaveBeenCalledWith('app');
    });

    it('Should resolve through the apikey param (slug) when the host resolves nothing', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('app.ethernal.com', { query: { apikey: 'mychain' } }));

        expect(result).toEqual({ via: 'apikey', ...RESOLVED });
        expect(db.getPublicExplorerParamsBySlug).toHaveBeenCalledWith('mychain');
    });

    it('Should read apikey from the params passed by the caller', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

        const result = await resolvePublicExplorer(req('x.example.org'), { apikey: 'mychain' });

        expect(result.via).toBe('apikey');
    });

    it('Should prefer the host over the apikey', async () => {
        db.getPublicExplorerParamsBySlug.mockImplementation(async slug => slug === 'hostslug' ? explorer({ id: 1, slug: 'hostslug' }) : explorer({ id: 2, slug: 'keyslug' }));

        const result = await resolvePublicExplorer(req('hostslug.ethernal.com', { query: { apikey: 'keyslug' } }));

        expect(result).toEqual({ via: 'host', ...RESOLVED, explorerId: 1, slug: 'hostslug' });
    });

    it('Should ignore apikeys that are not valid slugs', async () => {
        for (const apikey of ['UPPER', 'with_underscore', 'a'.repeat(65), '', ['a', 'b'], { a: 1 }])
            expect(await resolvePublicExplorer(req('app.ethernal.com', { query: { apikey } }))).toBeNull();

        expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
    });

    it('Should reject explorers without a subscription, with a private workspace, or without admin', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValueOnce(explorer({ stripeSubscription: null }));
        expect(await resolvePublicExplorer(req('mychain.ethernal.com'))).toBeNull();

        db.getPublicExplorerParamsBySlug.mockResolvedValueOnce(explorer({ workspace: { id: 7, name: 'w', public: false } }));
        expect(await resolvePublicExplorer(req('other.ethernal.com'))).toBeNull();

        db.getPublicExplorerParamsBySlug.mockResolvedValueOnce(explorer({ admin: null, slug: 'third' }));
        expect(await resolvePublicExplorer(req('third.ethernal.com'))).toBeNull();
    });

    it('Should return null when the host is missing or invalid and there is no apikey', async () => {
        expect(await resolvePublicExplorer({ headers: {}, query: {} })).toBeNull();
        expect(await resolvePublicExplorer(req('bad_host.ethernal.com'))).toBeNull();
    });

    describe('caching', () => {
        it('Should cache each lookup under its own key, without the via field', async () => {
            db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

            await resolvePublicExplorer(req('mychain.ethernal.com'));

            expect(redis.set).toHaveBeenCalledWith('publicExplorer:slug:mychain', JSON.stringify(RESOLVED), 'EX', 60);
        });

        it('Should return the same shape on a cache hit, with via set per call', async () => {
            redis.get.mockResolvedValue(JSON.stringify(RESOLVED));

            const viaHost = await resolvePublicExplorer(req('mychain.ethernal.com'));
            const viaKey = await resolvePublicExplorer(req('app.ethernal.com', { query: { apikey: 'mychain' } }));

            expect(viaHost).toEqual({ via: 'host', ...RESOLVED });
            expect(viaKey).toEqual({ via: 'apikey', ...RESOLVED });
            expect(db.getPublicExplorerParamsBySlug).not.toHaveBeenCalled();
            expect(redis.set).not.toHaveBeenCalled();
        });

        it('Should cache negative results for 60 seconds', async () => {
            db.getPublicExplorerParamsByDomain.mockResolvedValue(null);

            expect(await resolvePublicExplorer(req('nothing.example.org'))).toBeNull();

            expect(redis.set).toHaveBeenCalledWith('publicExplorer:domain:nothing.example.org', 'null', 'EX', 60);
        });

        it('Should return a cached negative result without hitting the database', async () => {
            redis.get.mockResolvedValue('null');

            expect(await resolvePublicExplorer(req('nothing.example.org'))).toBeNull();

            expect(db.getPublicExplorerParamsByDomain).not.toHaveBeenCalled();
        });

        it('Should never store an apikey result under a host key', async () => {
            db.getPublicExplorerParamsByDomain.mockResolvedValue(null);
            db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

            const result = await resolvePublicExplorer(req('custom.example.org', { query: { apikey: 'mychain' } }));

            expect(result.via).toBe('apikey');
            const stored = Object.fromEntries(redis.set.mock.calls.map(call => [call[0], call[1]]));
            expect(stored['publicExplorer:domain:custom.example.org']).toBe('null');
            expect(stored['publicExplorer:slug:mychain']).toBe(JSON.stringify(RESOLVED));
        });

        it('Should fall through to the database when Redis reads fail', async () => {
            redis.get.mockRejectedValue(new Error('redis down'));
            db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

            expect(await resolvePublicExplorer(req('mychain.ethernal.com'))).toEqual({ via: 'host', ...RESOLVED });
            expect(redis.set).not.toHaveBeenCalled();
        });

        it('Should still resolve when Redis writes fail', async () => {
            redis.set.mockRejectedValue(new Error('redis down'));
            db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

            expect(await resolvePublicExplorer(req('mychain.ethernal.com'))).toEqual({ via: 'host', ...RESOLVED });
        });

        it('Should ignore a corrupted cache entry', async () => {
            redis.get.mockResolvedValue('{not json');
            db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());

            expect(await resolvePublicExplorer(req('mychain.ethernal.com'))).toEqual({ via: 'host', ...RESOLVED });
        });
    });
});

describe('loadPublicWorkspace', () => {
    const resolved = { via: 'host', ...RESOLVED };

    it('Should return the workspace when it is the same and public', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: true });

        expect(await loadPublicWorkspace(resolved)).toEqual({ id: 7, name: 'my-workspace', public: true });
        expect(db.getWorkspaceByNameAuth).toHaveBeenCalledWith('uid-1', 'my-workspace');
    });

    it('Should return null when the workspace turned private', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: false });
        expect(await loadPublicWorkspace(resolved)).toBeNull();
    });

    it('Should return null when the workspace was renamed or deleted', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue(null);
        expect(await loadPublicWorkspace(resolved)).toBeNull();
    });

    it('Should return null when the name now points to another workspace', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 99, name: 'my-workspace', public: true });
        expect(await loadPublicWorkspace(resolved)).toBeNull();
    });

    it('Should return null without a resolved explorer', async () => {
        expect(await loadPublicWorkspace(null)).toBeNull();
    });
});

describe('resolveExplorerParamsFallback', () => {
    it('Should return the full explorer params of a public explorer', async () => {
        const full = explorer({ userId: 3, workspaceId: 7 });
        db.getPublicExplorerParamsBySlug.mockResolvedValue(full);
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: true });

        expect(await resolveExplorerParamsFallback(req('mychain.ethernal.com'), {})).toBe(full);
    });

    it('Should return null when the workspace is not public anymore', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(explorer());
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: false });

        expect(await resolveExplorerParamsFallback(req('mychain.ethernal.com'), {})).toBeNull();
    });

    it('Should return null when nothing resolves', async () => {
        expect(await resolveExplorerParamsFallback(req('nothing.example.org'), {})).toBeNull();
    });
});
