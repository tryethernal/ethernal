const express = require('express');
const router = express.Router();
const axios = require('axios');
const { unmanagedError } = require('../lib/errors');

router.get('/compilers', async (req, res, next) => {
    try {
        const result = (await axios.get('https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json')).data;

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
