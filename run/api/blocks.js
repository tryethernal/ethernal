const express = require('express');
const { stringifyBns, sanitize } = require('../lib/utils');
const db = require('../lib/firebase');
const { enqueueTask } = require('../lib/tasks');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.post('/syncRange', authMiddleware, async (req, res) => {
    try {
        const data = req.body.data;

        if (!data.workspace || data.from === undefined || data.from === null || data.to === undefined || data.to === null) {
            console.log(data)
            throw new Error('[POST /api/blocks/syncRange] Missing parameter');
        }

        await enqueueTask('batchBlockSync', {
            userId: data.uid,
            workspace: data.workspace,
            from: data.from,
            to: data.to,
            secret: process.env.AUTH_SECRET,
        }, `${process.env.CLOUD_RUN_ROOT}/tasks/batchBlockSync`);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = req.query;

        const blocks = await db.getWorkspaceBlocks(data.workspace.id, data.page, data.itemsPerPage, data.order);
        
        res.status(200).json(blocks);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/:number', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = req.query;
        if (!req.params.number)
            throw '[GET /api/blocks/:number] Missing parameter';

        const block = await db.getWorkspaceBlock(data.workspace.id, req.params.number, !!data.withTransactions);

        res.status(200).json(block);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const data = req.body.data;

        const block = data.block;

        if (!block)
            throw Error('[POST /api/blocks] Missing block parameter.');

        const serverSync = req.query.serverSync && String(req.query.serverSync) === 'true';

        if (serverSync) {
            if (block.number === undefined || block.number === null)
                throw Error('[POST /api/blocks] Missing block number.');

            await enqueueTask('blockSync', {
                userId: data.uid,
                workspace: data.workspace,
                blockNumber: data.block.number,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/blockSync`);
        }
        else {
            const syncedBlock = stringifyBns(sanitize(block));
            const storedBlock = await db.storeBlock(data.uid, data.workspace, syncedBlock);
        }

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});

module.exports = router;
