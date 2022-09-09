const express = require('express');
const ethers = require('ethers');
const axios = require('axios');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const db = require('../lib/firebase');
const { ERC721Connector } = require('../lib/rpc');
const { sanitize } = require('../lib/utils');
const Workspace = db.Workspace;
const router = express.Router();
const { enqueueTask } = require('../lib/tasks');

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspaceId) {
            console.log(data);
            throw '[POST /tasks/findAndProcessExistingErc721] Missing parameter.';
        }

        const workspace = await Workspace.findByPk(data.workspaceId);
        const contracts = await workspace.getContracts();

        for (let i = 0; i < contracts.length; i++)
            await workspace.safeCreateOrUpdateContract({ address: contracts[i].address, processed: false });

        for (let i = 0; i < contracts.length; i++)
            enqueueTask('contractProcessing', {
                contractId: contracts[i].id,
                workspaceId: contracts[i].workspaceId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/contractProcessing`)

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
