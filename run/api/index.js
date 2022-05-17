const express = require('express');
const router = express.Router();

const blocks = require('./blocks');
const contracts = require('./contracts');
const transactions = require('./transactions');
const workspaces = require('./workspaces');
const addresses = require('./addresses');
const users = require('./users');
const accounts = require('./accounts');

router.use('/blocks', blocks);
router.use('/contracts', contracts);
router.use('/transactions', transactions);
router.use('/workspaces', workspaces);
router.use('/users', users);
router.use('/accounts', accounts);

module.exports = router;