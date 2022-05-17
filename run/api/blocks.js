const express = require('express');
const { stringifyBns, sanitize } = require('../lib/utils');
const db = require('../lib/firebase');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    try {
        const data = req.query;

        if (!data.page || !data.itemsPerPage)
            throw '[GET /api/blocks] Missing parameters';

        const blocks = await db.getWorkspaceBlocks(data.workspace.id, data.page, data.itemsPerPage, data.order || 'DESC');
        
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

        var syncedBlock = stringifyBns(sanitize(block));

        const storedBlock = await db.storeBlock(data.uid, data.workspace, syncedBlock);

        // TODO: Bill usage for if empty block

        res.status(200).json({ blockNumber: syncedBlock.number });
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
