const express = require('express');
const { enqueueTask } = require('../lib/tasks');
const writeLog = require('../lib/writeLog');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.userId || !data.workspace || data.from === null || data.from === undefined || data.to === null || data.to === undefined) {
            throw '[POST /tasks/batchBlockSync] Missing parameter.';
        }

        const MAX_CONCURRENT_BATCHES = 1000;
        const start = parseInt(data.from);
        let end = parseInt(data.to);

        if (end - start >= MAX_CONCURRENT_BATCHES) {
            end = start + MAX_CONCURRENT_BATCHES;
            enqueueTask('batchBlockSync', {
                userId: data.userId,
                workspace: data.workspace,
                from: end,
                to: parseInt(data.to),
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/batchBlockSync`);
        }
        else
            end += 1;

        for (let i = start; i < end; i++) {
            const promises = [];
            promises.push(
                enqueueTask('secondaryBlockSync', {
                    userId: data.userId,
                    workspace: data.workspace,
                    blockNumber: i,
                    secret: process.env.AUTH_SECRET
                }, `${process.env.CLOUD_RUN_ROOT}/tasks/secondaryBlockSync`)
            );
            await Promise.all(promises);
        }

        res.sendStatus(200);
    } catch(error) {
        writeLog({
            functionName: 'tasks.batchBlockSync',
            error: error,
            extra: {
                data: data
            }
        });
        res.sendStatus(400);
    }
});

module.exports = router;
