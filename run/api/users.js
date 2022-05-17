const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');

router.post('/', async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.data) {
            console.log(data);
            throw new Error('POST [/api/users] Missing parameter.');
        }

        await db.createUser(data.uid, data.data);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
