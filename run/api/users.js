const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');

router.post('/me/setCurrentWorkspace', authMiddleware, async (req, res) => {
    const data = req.body.data;
    console.log(data);
    try {
        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid);

        res.status(200).json(user);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
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
        res.status(400).send(error);
    }
});

module.exports = router;
