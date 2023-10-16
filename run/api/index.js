const express = require('express');
const { isStripeEnabled, isMarketingEnabled, isDemoEnabled } = require('../lib/flags');
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

if (isDemoEnabled()) {
    const demo = require('./demo');
    router.use('/demo', demo);
}

if (isStripeEnabled()) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

if (isMarketingEnabled()) {
    const marketing = require('./marketing');
    router.use('/marketing', marketing);
}

module.exports = router;
