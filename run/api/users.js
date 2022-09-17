const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');

router.get('/me/getApiToken', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid, ['apiKey', 'apiToken']);

        res.status(200).json({ apiToken: user.apiToken });
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.post('/me/setCurrentWorkspace', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid);

        res.status(200).json(user);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

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
        res.status(400).send(error.message);
    }
});

module.exports = router;
