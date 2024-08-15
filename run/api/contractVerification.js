const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const data = {
        headers: req.headers,
        body: req.body
    };

    res.status(200).send(data);
});

module.exports = router;
