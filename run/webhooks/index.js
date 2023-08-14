const express = require('express');
const router = express.Router();
const { isStripeEnabled } = require('../lib/flags');

if (isStripeEnabled()) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

module.exports = router;
