require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/middlewares/selfHosted');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/lib/env');

const db = require('../../lib/firebase');
const flags = require('../../lib/flags');
const env = require('../../lib/env');

jest.spyOn(flags, 'isSelfHosted')
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(true);

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/caddy';

describe(`GET ${BASE_URL}/validDomain`, () => {

    beforeEach(() => {
        jest.clearAllMocks();
        env.getAppDomain.mockReturnValue('example.com');
        db.isValidExplorerDomain.mockReset();
        db.isValidExplorerDomain.mockResolvedValue(false);
    });

    it('Should return a 400 if domain is not allowed', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'other.com' })
            .expect(400);
        expect(db.isValidExplorerDomain).toHaveBeenCalledWith('other.com');
    });

    it('Should return a 200 for the app domain itself', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'example.com' })
            .expect(200);
        expect(db.isValidExplorerDomain).not.toHaveBeenCalled();
    });

    it('Should return a 200 for a single-label subdomain', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'subdomain.example.com' })
            .expect(200);
        expect(db.isValidExplorerDomain).not.toHaveBeenCalled();
    });

    it('Should return a 200 for app. and www. subdomains', async () => {
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'app.example.com' }).expect(200);
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'www.example.com' }).expect(200);
    });

    it('Should return a 400 for a two-level subdomain', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'sberbank.pochta.x.y.beautiful-faint-flag.example.com' })
            .expect(400);
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'a.b.example.com' })
            .expect(400);
        expect(db.isValidExplorerDomain).toHaveBeenCalledTimes(2);
    });

    it('Should return a 200 for a two-level subdomain registered as a custom domain', async () => {
        db.isValidExplorerDomain.mockResolvedValueOnce(true);
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'explorer.chain.example.com' })
            .expect(200);
        expect(db.isValidExplorerDomain).toHaveBeenCalledWith('explorer.chain.example.com');
    });

    it('Should return a 400 for a lookalike domain ending with the app domain', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'evilexample.com' })
            .expect(400);
        expect(db.isValidExplorerDomain).toHaveBeenCalledWith('evilexample.com');
    });

    it('Should return a 400 for a subdomain with an empty label', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: '.example.com' })
            .expect(400);
    });

    it('Should handle uppercase and trailing dot', async () => {
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'Foo.EXAMPLE.com' }).expect(200);
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'foo.example.com.' }).expect(200);
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'EXAMPLE.COM.' }).expect(200);
        await request.get(`${BASE_URL}/validDomain`).query({ domain: 'a.foo.example.com.' }).expect(400);
    });

    it('Should return a 200 for a registered custom domain', async () => {
        db.isValidExplorerDomain.mockResolvedValueOnce(true);
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'explorer.customer.io' })
            .expect(200);
        expect(db.isValidExplorerDomain).toHaveBeenCalledWith('explorer.customer.io');
    });

    it('Should return a 400 for an unknown custom domain', async () => {
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'explorer.unknown.io' })
            .expect(400);
    });

    it('Should skip the app domain shortcut if the app domain is not set', async () => {
        env.getAppDomain.mockReturnValue(undefined);
        await request.get(`${BASE_URL}/validDomain`)
            .query({ domain: 'foo.example.com' })
            .expect(400);
        expect(db.isValidExplorerDomain).toHaveBeenCalledWith('foo.example.com');
    });

    it('Should return an error if the domain is missing', async () => {
        const res = await request.get(`${BASE_URL}/validDomain`);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(db.isValidExplorerDomain).not.toHaveBeenCalled();
    });
});
