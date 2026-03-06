const express = require('express');
const router = express.Router();
const { isStripeEnabled, isQuicknodeEnabled, isSentryPipelineEnabled } = require('../lib/flags');

if (isStripeEnabled()) {
    const stripe = require('./stripe');
    router.use('/stripe', stripe);
}

if (isQuicknodeEnabled()) {
    const quicknode = require('./quicknode');
    router.use('/quicknode', quicknode);
}

if (isSentryPipelineEnabled()) {
    const githubActions = require('./githubActions');
    router.use('/github-actions', githubActions);
}

module.exports = router;
