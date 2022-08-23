const express = require('express');
const { processTransactions } = require('../lib/transactions');
const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspace) {
            console.log(data);
            throw '[POST /tasks/processWorkspace] Missing parameter.';
        }

        const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

        try {
            const provider = new ProviderConnector(workspace.rpcServer);
            const networkId = await provider.fetchNetworkId();
            await db.setWorkspaceRemoteFlag(data.uid, data.workspace, true);
        } catch(_error) {
            await db.setWorkspaceRemoteFlag(data.uid, data.workspace, false);
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
