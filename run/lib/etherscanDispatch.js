/**
 * @fileoverview Dispatch table for the Etherscan-compatible API (`/api?module=...&action=...`).
 * Each entry rewrites the request to the internal route that implements the action.
 * The four contract entries keep their historical match conditions and merge semantics
 * exactly; new actions read parameters with query-over-body precedence.
 * @module lib/etherscanDispatch
 */

/**
 * Merges query and body with query taking precedence (used by the new actions).
 * @param {Object} req - Express request
 * @returns {Object} Merged parameters
 */
const queryOverBody = (req) => ({ ...(req.body || {}), ...(req.query || {}) });

/**
 * Builds a dispatch entry for a new GET-only action.
 * @param {string} module - Etherscan module
 * @param {string} action - Etherscan action
 * @returns {Object} Dispatch entry
 */
const getAction = (module, action) => ({
    key: `${module}/${action}`,
    methods: ['GET'],
    match: (data, req) => req.method === 'GET' && queryOverBody(req).module === module && queryOverBody(req).action === action,
    target: `/api/etherscan/${module}/${action}`
});

/**
 * Dispatch table. Order matters: the first matching entry wins.
 * `methods` is the list of HTTP methods the target route accepts.
 * `match(data, req)` receives `data = { ...req.query, ...req.body }` (legacy merge) and the request.
 * @type {Array<{key: string, methods: string[], match: Function, target: string}>}
 */
const dispatchTable = [
    {
        key: 'contract/verifysourcecode',
        methods: ['POST'],
        match: (data) => data.module == 'contract' && data.action == 'verifysourcecode',
        target: '/api/contracts/verify'
    },
    {
        key: 'contract/getsourcecode',
        methods: ['GET'],
        match: (data) => data.module == 'contract' && data.action == 'getsourcecode',
        target: '/api/contracts/sourceCode'
    },
    {
        key: 'contract/getabi',
        methods: ['GET'],
        match: (data, req) => req.query.module == 'contract' && req.query.action == 'getabi',
        target: '/api/contracts/getabi'
    },
    {
        key: 'contract/checkverifystatus',
        methods: ['GET', 'POST'],
        match: (data) => data.module == 'contract' && data.action == 'checkverifystatus' && data.guid,
        target: '/api/contracts/verificationStatus'
    },
    getAction('account', 'balance'),
    getAction('account', 'balancemulti'),
    getAction('account', 'txlist'),
    getAction('transaction', 'getstatus'),
    getAction('transaction', 'gettxreceiptstatus'),
    getAction('block', 'getblocknumberbytime'),
    getAction('logs', 'getLogs')
];

/**
 * Express middleware rewriting `/api?module=...&action=...` to the internal route of the
 * matching action. Unknown module/action combinations are left untouched.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const etherscanDispatcher = (req, res, next) => {
    // `/api/` is accepted too: the OpenAPI document models the layer as `GET /` under the `/api` server URL.
    if (req.path != '/api' && req.path != '/api/')
        return next();

    const data = { ...req.query, ...req.body };
    const entry = dispatchTable.find(e => e.match(data, req));
    if (entry)
        req.url = entry.target;

    next();
};

module.exports = { dispatchTable, etherscanDispatcher };
