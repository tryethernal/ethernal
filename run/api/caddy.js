const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/validDomain', async (req, res, next) => {
    return res.sendStatus(200);
});

module.exports = router;
