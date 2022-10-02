const express = require('express');
const router = express.Router();

router.use('/enforceDataRetention', require('./enforceDataRetention'));

module.exports = router;
