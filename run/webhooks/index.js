const express = require('express');
const router = express.Router();

if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

module.exports = router;
