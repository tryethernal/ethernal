const express = require('express');
const router = express.Router();

const blockSync = require('./blockSync');
const transactionSync = require('./transactionSync');
const transactionProcessing = require('./transactionProcessing');
const processContract = require('./processContract');
const processWorkspace = require('./processWorkspace');
const submitExplorerLead = require('./submitExplorerLead');
const fetchAndStoreErc721Token = require('./fetchAndStoreErc721Token');
const reloadErc721 = require('./reloadErc721');

router.use('/blockSync', blockSync);
router.use('/transactionSync', transactionSync);
router.use('/transactionProcessing', transactionProcessing);
router.use('/contractProcessing', processContract);
router.use('/submitExplorerLead', submitExplorerLead);
router.use('/processWorkspace', processWorkspace);
router.use('/fetchAndStoreErc721Token', fetchAndStoreErc721Token);
router.use('/reloadErc721', reloadErc721);

module.exports = router;
