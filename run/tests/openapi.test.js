/**
 * @fileoverview Drift test between the Express routes and the OpenAPI document
 * (lib/openapi/openapi.yaml). Fails when a public route is neither documented nor
 * explicitly excluded, when the document describes a route that no longer exists,
 * or when the Etherscan dispatcher and `x-etherscan-actions` disagree.
 */

jest.mock('../lib/flags', () => {
    const actual = jest.requireActual('../lib/flags');
    return Object.fromEntries(Object.keys(actual).map(name => [name, jest.fn(() => true)]));
});

require('./mocks/lib/queue');
require('./mocks/lib/firebase');
require('./mocks/models');
require('./mocks/lib/firebase-admin');
require('./mocks/lib/crypto');
require('./mocks/lib/env');

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

const api = require('../api');
const app = require('../app');
const { dispatchTable } = require('../lib/etherscanDispatch');

const OPENAPI_PATH = path.join(__dirname, '../lib/openapi/openapi.yaml');
const EXCLUDED_PATH = path.join(__dirname, '../lib/openapi/excluded-routes.json');
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

const workspaceAuth = require('../middlewares/workspaceAuth');
const guards = [
    'auth', 'secret', 'passportLocalStrategy', 'passportTokenStrategy', 'quicknode',
    'sentryDashboardAuth', 'webhook', 'githubActionsWebhook', 'prospecting', 'selfHosted'
].map(name => require(`../middlewares/${name}`));

/**
 * Recovers the static mount path of a router layer (`router.use('/blocks', ...)`).
 * @param {Object} layer - Express layer
 * @returns {string} Mount path ('' for the root)
 */
const mountPath = (layer) => {
    if (layer.regexp.fast_slash)
        return '';
    return layer.regexp.source
        .replace('^\\/', '/')
        .replace('\\/?(?=\\/|$)', '')
        .replace(/\$$/, '')
        .replace(/\\(.)/g, '$1');
};

/**
 * Walks an Express router stack and returns every route with its middleware classification.
 * @param {Array} stack - Router stack
 * @param {string} prefix - Path prefix
 * @returns {Array<{key: string, workspaceAuth: boolean, guarded: boolean}>} Routes as `METHOD /path`
 */
const walk = (stack, prefix = '') => {
    const routes = [];
    for (const layer of stack) {
        if (layer.route) {
            const chain = layer.route.stack.map(l => l.handle);
            const routePath = (prefix + layer.route.path).replace(/\/+$/, '') || '/';
            for (const method of Object.keys(layer.route.methods))
                routes.push({
                    key: `${method.toUpperCase()} ${routePath}`,
                    workspaceAuth: chain.includes(workspaceAuth),
                    guarded: chain.some(handle => guards.includes(handle))
                });
        }
        else if (layer.name === 'router' && layer.handle.stack)
            routes.push(...walk(layer.handle.stack, prefix + mountPath(layer)));
    }
    return routes;
};

/**
 * Normalises an OpenAPI path to Express syntax (`{id}` to `:id`).
 * @param {string} openapiPath - OpenAPI path
 * @returns {string} Express path
 */
const toExpressPath = (openapiPath) => openapiPath.replace(/\{([^}]+)\}/g, ':$1');

const doc = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));
const excluded = JSON.parse(fs.readFileSync(EXCLUDED_PATH, 'utf8'));
const allRoutes = walk(api.stack);
const collected = new Set(allRoutes.filter(r => r.workspaceAuth || !r.guarded).map(r => r.key));
const documented = new Set();
Object.entries(doc.paths).forEach(([p, operations]) => {
    if (p === '/')
        return;
    Object.keys(operations).filter(m => HTTP_METHODS.includes(m)).forEach(m => documented.add(`${m.toUpperCase()} ${toExpressPath(p).replace(/\/+$/, '')}`));
});

describe('OpenAPI document', () => {
    it('Should be a valid OpenAPI 3.1 document', async () => {
        expect(doc.openapi).toMatch(/^3\.1\./);
        await expect(SwaggerParser.validate(OPENAPI_PATH)).resolves.toBeDefined();
    });

    it('Should have unique operation ids', () => {
        const ids = [];
        Object.values(doc.paths).forEach(operations => Object.entries(operations).forEach(([m, op]) => HTTP_METHODS.includes(m) && ids.push(op.operationId)));
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('Should describe the Etherscan layer as GET / and POST /', () => {
        expect(Object.keys(doc.paths['/']).sort()).toEqual(['get', 'post']);
        expect(doc.paths['/'].get['x-etherscan-actions'].length).toBeGreaterThan(0);
    });

    it('Should declare the explorer domain server variable', () => {
        expect(doc.servers[0].url).toBe('https://{explorerDomain}/api');
        expect(doc.servers[0].variables.explorerDomain.default).toBe('demo.tryethernal.com');
    });
});

describe('Route drift', () => {
    it('Should find the routes mounted in api/index.js', () => {
        expect(allRoutes.length).toBeGreaterThan(100);
        expect(collected.has('GET /blocks/:number')).toBe(true);
    });

    it('Should document or explicitly exclude every public route', () => {
        const offenders = [...collected].filter(key => !documented.has(key) && !excluded.includes(key)).sort();
        expect(offenders).toEqual([]);
    });

    it('Should not document a route that no longer exists', () => {
        const stale = [...documented].filter(key => !collected.has(key)).sort();
        expect(stale).toEqual([]);
    });

    it('Should not exclude a route that no longer exists or that is documented', () => {
        const stale = excluded.filter(key => !collected.has(key) || documented.has(key)).sort();
        expect(stale).toEqual([]);
    });

    it('Should exclude the internal routes the Etherscan dispatcher rewrites to', () => {
        const internal = dispatchTable.flatMap(entry => entry.methods.map(method => `${method} ${entry.target.replace(/^\/api/, '')}`));
        expect(internal.length).toBeGreaterThan(0);
        expect(internal.filter(key => !excluded.includes(key))).toEqual([]);
    });
});

describe('Etherscan dispatcher', () => {
    const actions = doc.paths['/'].get['x-etherscan-actions'];

    it('Should be exposed by app.js', () => {
        expect(app.etherscanDispatch).toBe(dispatchTable);
    });

    it('Should match x-etherscan-actions in both directions, including methods', () => {
        const fromDispatcher = Object.fromEntries(dispatchTable.map(entry => [entry.key, [...entry.methods].sort()]));
        const fromDocument = Object.fromEntries(actions.map(action => [action.key, [...action.methods].sort()]));
        expect(fromDispatcher).toEqual(fromDocument);
    });

    it('Should only target routes that exist and accept the declared methods', () => {
        const routeKeys = new Set(allRoutes.map(r => r.key));
        dispatchTable.forEach(entry => entry.methods.forEach(method =>
            expect(routeKeys.has(`${method} ${entry.target.replace(/^\/api/, '')}`)).toBe(true)));
    });

    it('Should document each action result and parameters', () => {
        actions.forEach(action => {
            expect(action.result).toBeDefined();
            expect(Array.isArray(action.params)).toBe(true);
        });
    });

    it('Should list the GET actions in the module/action enums', () => {
        const getActions = actions.filter(a => a.methods.includes('GET')).map(a => a.key.split('/')[1]).sort();
        const actionParam = doc.paths['/'].get.parameters.find(p => p.name === 'action');
        expect([...actionParam.schema.enum].sort()).toEqual([...new Set(getActions)].sort());
    });
});
