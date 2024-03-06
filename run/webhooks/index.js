const express = require('express');
const router = express.Router();
const { isStripeEnabled, isQuicknodeEnabled } = require('../lib/flags');

if (isStripeEnabled()) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

if (isQuicknodeEnabled()) {
    const quicknode = require('./quicknode');
    router.use('/quicknode', quicknode);
}

module.exports = router;
