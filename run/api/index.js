const express = require('express');
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
const stripe = require('./stripe');
const search = require('./search');
const stats = require('./stats');
const marketing = require('./marketing');
const erc721Collections = require('./erc721Collections');
const erc721Tokens = require('./erc721Tokens');
const erc20Contracts = require('./erc20Contracts');

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
router.use('/stripe', stripe);
router.use('/search', search);
router.use('/stats', stats);
router.use('/marketing', marketing);
router.use('/erc721Collections', erc721Collections);
router.use('/erc721Tokens', erc721Tokens);
router.use('/erc20Contracts', erc20Contracts);

module.exports = router;
