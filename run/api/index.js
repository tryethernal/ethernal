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

module.exports = router;
