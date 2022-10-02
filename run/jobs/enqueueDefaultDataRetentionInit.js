const express = require('express');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const { enqueueTask } = require('../lib/tasks');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        await enqueueTask('initializeDefaultDataRetention', {
            secret: process.env.AUTH_SECRET
        });
        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
