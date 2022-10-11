const express = require('express');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspaceId) {
            console.log(data);
            throw '[POST /tasks/enforceDataRetentionForWorkspace] Missing parameter.';
        }

        const workspace = await db.getWorkspaceById(data.workspaceId);
        const user = await db.getUserById(workspace.userId);
        if (workspace.dataRetentionLimit > 0)
            await db.resetWorkspace(user.firebaseUserId, workspace.name, workspace.dataRetentionLimit);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
