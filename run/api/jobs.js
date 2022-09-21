const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const User = db.User;
const taskAuthMiddleware = require('../middlewares/taskAuth');
const { enqueueTask } = require('../lib/tasks');

router.post('/findAndProcessExistingErc721', taskAuthMiddleware, async (req, res) => {
    const data = req.body;

    try {
        if (!data.workspaceId)
            throw new Error('[GET /api/jobs/findAndProcessExistingErc721] Missing parameters.');

        await enqueueTask('findAndProcessExistingErc721', {
            workspaceId: data.workspaceId,
            secret: process.env.AUTH_SECRET
        }, `${process.env.CLOUD_RUN_ROOT}/tasks/findAndProcessExistingErc721`)

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

module.exports = router;
