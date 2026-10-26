require('../mocks/lib/queue');
require('../mocks/lib/utils');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/logger');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/crypto');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const EXPLORER = {
    id: 5,
    name: 'My Chain',
    slug: 'mychain',
    stripeSubscription: { id: 1 },
    workspace: { id: 7, name: 'my-workspace', public: true },
    admin: { firebaseUserId: 'uid-admin' }
};

beforeEach(() => {
    jest.clearAllMocks();
    Object.values(db).forEach(fn => fn.mockReset());
    db.getPublicExplorerParamsBySlug.mockResolvedValue(EXPLORER);
    db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: true });
});

describe('GET /api/openapi.json', () => {
    it('Should serve the OpenAPI 3.1 document without authentication', async () => {
        const response = await request.get('/api/openapi.json').expect(200);

        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.headers['cache-control']).toBe('public, max-age=300');
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.body.openapi).toMatch(/^3\.1\./);
        expect(response.body.servers[0].url).toBe('https://{explorerDomain}/api');
        expect(response.body.paths['/blocks']).toBeDefined();
        expect(response.body.paths['/']).toBeDefined();
    });

    it('Should personalise servers and title when called on an explorer host', async () => {
        const { body } = await request.get('/api/openapi.json').set('X-Forwarded-Host', 'MyChain.ethernal.com:443').expect(200);

        expect(body.servers).toEqual([{ url: 'https://mychain.ethernal.com/api' }]);
        expect(body.info.title).toBe('My Chain API');
        expect(body.paths['/blocks']).toBeDefined();
    });

    it('Should return the document unchanged when the explorer is resolved through apikey', async () => {
        const { body } = await request.get('/api/openapi.json').query({ apikey: 'mychain' }).expect(200);

        expect(body.servers[0].url).toBe('https://{explorerDomain}/api');
        expect(body.info.title).toBe('Ethernal Explorer API');
    });

    it('Should return the document unchanged when the host resolves nothing', async () => {
        db.getPublicExplorerParamsBySlug.mockResolvedValue(null);
        db.getPublicExplorerParamsByDomain.mockResolvedValue(null);

        const { body } = await request.get('/api/openapi.json').set('X-Forwarded-Host', 'nothing.ethernal.com').expect(200);

        expect(body.info.title).toBe('Ethernal Explorer API');
    });

    it('Should return the document unchanged when the workspace is not public anymore', async () => {
        db.getWorkspaceByNameAuth.mockResolvedValue({ id: 7, name: 'my-workspace', public: false });

        const { body } = await request.get('/api/openapi.json').set('X-Forwarded-Host', 'mychain.ethernal.com').expect(200);

        expect(body.info.title).toBe('Ethernal Explorer API');
        expect(body.servers[0].url).toBe('https://{explorerDomain}/api');
    });

    it('Should not leak a personalised document to the next request', async () => {
        await request.get('/api/openapi.json').set('X-Forwarded-Host', 'mychain.ethernal.com').expect(200);

        const { body } = await request.get('/api/openapi.json').expect(200);

        expect(body.info.title).toBe('Ethernal Explorer API');
        expect(body.servers[0].url).toBe('https://{explorerDomain}/api');
    });

    it('Should still serve the document when personalisation fails', async () => {
        db.getPublicExplorerParamsBySlug.mockRejectedValue(new Error('db down'));

        const { body } = await request.get('/api/openapi.json').set('X-Forwarded-Host', 'mychain.ethernal.com').expect(200);

        expect(body.info.title).toBe('Ethernal Explorer API');
    });
});
