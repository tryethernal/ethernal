const express = require('express');
const { isStripeEnabled, isDemoEnabled, isSelfHosted } = require('../lib/flags');
const router = express.Router();

const blocks = require('./blocks');
const contracts = require('./contracts');
const transactions = require('./transactions');
const workspaces = require('./workspaces');
const users = require('./users');
const accounts = require('./accounts');
const addresses = require('./addresses');
const pusher = require('./pusher');
const explorers = require('./explorers');
const search = require('./search');
const stats = require('./stats');
const erc721Collections = require('./erc721Collections');
const erc721Tokens = require('./erc721Tokens');
const status = require('./status');
const external = require('./external');
const domains = require('./domains');
const faucets = require('./faucets');
const v2Dexes = require('./v2Dexes');
const gas = require('./gas');
const transactionTraceSteps = require('./transactionTraceSteps');
const caddy = require('./caddy');
router.use('/blocks', blocks);
router.use('/contracts', contracts);
router.use('/transactions', transactions);
router.use('/workspaces', workspaces);
router.use('/users', users);
router.use('/accounts', accounts);
router.use('/add', accounts);
router.use('/addresses', addresses);
router.use('/pusher', pusher);
router.use('/explorers', explorers);
router.use('/search', search);
router.use('/stats', stats);
router.use('/erc721Collections', erc721Collections);
router.use('/erc721Tokens', erc721Tokens);
router.use('/status', status);
router.use('/external', external);
router.use('/domains', domains);
router.use('/faucets', faucets);
router.use('/v2_dexes', v2Dexes);
router.use('/gas', gas);
router.use('/transactionTraceSteps', transactionTraceSteps);
router.use('/caddy', caddy);

if (isDemoEnabled()) {
    const demo = require('./demo');
    router.use('/demo', demo);
}

if (isStripeEnabled()) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

if (isSelfHosted()) {
    const marketing = require('./marketing');
    const setup = require('./setup');

    router.use('/setup', setup);
    router.use('/marketing', marketing);
}

module.exports = router;
