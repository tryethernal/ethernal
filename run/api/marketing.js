const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const { enqueueTask } = require('../lib/tasks');

router.get('/', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.workspace)
            throw new Error('[GET /api/marketing] Missing parameters.');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        res.status(200).json({
            isRemote: workspace.isRemote
        });
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

router.post('/submitExplorerLead', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.workspace || !data.email)
            throw new Error('[GET /api/submitExplorerLead] Missing parameters.');

        await enqueueTask('submitExplorerLead', {
            workspace: data.workspace,
            email: data.email,
            secret: process.env.AUTH_SECRET
        });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

router.post('/setRemoteFlag', authMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };
    try {
        if (!data.workspace)
            throw new Error('[GET /api/setRemoteFlag] Missing parameters.');

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        if (workspace.isRemote == null) {
            await enqueueTask('processWorkspace', {
                uid: data.uid,
                workspace: data.workspace,
                secret: process.env.AUTH_SECRET
            });
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        console.log(data);
        res.status(400).send(error.message);
    }
});

module.exports = router;
