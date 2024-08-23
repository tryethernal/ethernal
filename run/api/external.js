const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../lib/logger');

router.get('/compilers', async (req, res) => {
    try {
        const result = (await axios.get('https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json')).data;

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.external.compilers', error });
        res.status(400).send(error.message);
    }
});

module.exports = router;
