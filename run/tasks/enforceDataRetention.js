const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspace) {
            console.log(data);
            throw '[POST /tasks/resetWorkspace] Missing parameter.';
        }

        await db.getWorkspaceContracts(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
