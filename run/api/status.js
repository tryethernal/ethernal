const express = require('express');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { sanitize } = require('../lib/utils');
const router = express.Router();
const { managedError, unmanagedError } = require('../lib/errors');

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    const data = req.query;

    try {
        const workspace = data.workspace;

        if (!workspace.statusPageEnabled && !data.authenticated)
            return managedError(new Error('Status page not enabled'), req, res, 404);

        if ((workspace.integrityCheckStartBlockNumber === null || workspace.integrityCheckStartBlockNumber === undefined) && !workspace.rpcHealthCheckEnabled)
            return managedError(new Error('Status is not available on this workspace'), req, res);

        const integrityCheck = workspace.integrityCheck || {};
        const rpcHealthCheck = workspace.rpcHealthCheck || {};
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
        unmanagedError(error, req, next);
    }
});

module.exports = router;
