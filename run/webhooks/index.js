const express = require('express');
const router = express.Router();

const stripe = require('./stripe');

router.use('/stripe', stripe);

module.exports = router;
