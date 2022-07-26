const express = require('express');
const router = express.Router();

const blockSync = require('./blockSync');
const transactionSync = require('./transactionSync');
const transactionProcessing = require('./transactionProcessing');
const processContract = require('./processContract');

router.use('/blockSync', blockSync);
router.use('/transactionSync', transactionSync);
router.use('/transactionProcessing', transactionProcessing);
router.use('/contractProcessing', processContract);

module.exports = router;
