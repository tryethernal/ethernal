const express = require('express');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.userId || !data.workspace) {
            console.log(data);
            throw '[POST /tasks/enforceDataRetentionForWorkspace] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
        if (workspace.dataRetentionLimit > 0)
            await db.resetWorkspace(data.userId, data.workspace, workspace.dataRetentionLimit);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
