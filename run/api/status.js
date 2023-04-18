const express = require('express');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const { sanitize } = require('../lib/utils');
const router = express.Router();

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const workspace = data.workspace;

        if (!workspace.statusPageEnabled && !data.authenticated)
            return res.sendStatus(404);

        if (workspace.integrityCheckStartBlockNumber === null || workspace.integrityCheckStartBlockNumber === undefined || !workspace.rpcHealthCheckEnabled)
            throw new Error('Status is not available on this workspace');

        const integrityCheck = workspace.integrityCheck || {};
        const rpcHealthCheck = workspace.rpcHealthCheck || {};
        const result = sanitize({
            syncStatus: integrityCheck.status,
            latestCheckedBlock: integrityCheck.block && integrityCheck.block.number,
            latestCheckedAt: integrityCheck.updatedAt,
            startingBlock: workspace.integrityCheckStartBlockNumber,
            isRpcReachable: rpcHealthCheck.isReachable,
            rpcHealthCheckedAt: rpcHealthCheck.updatedAt
        });

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'api.status', error: error });
        res.status(400).send(error);
    }
});

module.exports = router;