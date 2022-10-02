const express = require('express');
const router = express.Router();

router.use('/enforceDataRetention', require('./enforceDataRetention'));
router.use('/enqueueDefaultDataRetentionInit', require('./enqueueDefaultDataRetentionInit'));

module.exports = router;
