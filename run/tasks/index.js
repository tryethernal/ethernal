const express = require('express');
const router = express.Router();

const blockSync = require('./blockSync');
const transactionSync = require('./transactionSync');
const transactionProcessing = require('./transactionProcessing');
const processContract = require('./processContract');
const processWorkspace = require('./processWorkspace');
const submitExplorerLead = require('./submitExplorerLead');
const reloadErc721Token = require('./reloadErc721Token');
const findAndProcessExistingErc721 = require('./findAndProcessExistingErc721');
const batchBlockSync = require('./batchBlockSync');
const enforceDataRetentionForWorkspace = require('./enforceDataRetentionForWorkspace');
const initializeDefaultDataRetention = require('./initializeDefaultDataRetention');

router.use('/blockSync', blockSync);
router.use('/transactionSync', transactionSync);
router.use('/transactionProcessing', transactionProcessing);
router.use('/contractProcessing', processContract);
router.use('/submitExplorerLead', submitExplorerLead);
router.use('/processWorkspace', processWorkspace);
router.use('/reloadErc721Token', reloadErc721Token);
router.use('/findAndProcessExistingErc721', findAndProcessExistingErc721);
router.use('/batchBlockSync', batchBlockSync);
router.use('/enforceDataRetentionForWorkspace', enforceDataRetentionForWorkspace);
router.use('/initializeDefaultDataRetention', initializeDefaultDataRetention);

module.exports = router;
