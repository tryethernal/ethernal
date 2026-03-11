/**
 * @fileoverview Status page API endpoints.
 * Provides health status for workspace sync and RPC connectivity.
 * @module api/status
 *
 * @route GET / - Get workspace sync and RPC health status
 */

const express = require('express');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { sanitize } = require('../lib/utils');
const router = express.Router();
const { managedError, unmanagedError } = require('../lib/errors');
const redis = require('../lib/redis');

/**
 * @route GET /health - Public infrastructure health endpoint
 * Returns service statuses for external monitoring (UptimeRobot, OpsGenie heartbeat).
 * No auth required. Returns 200 if all ok, 503 if any service is unhealthy.
 */
router.get('/health', async (req, res) => {
    const services = {};
    let overallStatus = 'healthy';
    const CHECK_TIMEOUT = 5000;

    // Run checks in parallel to stay within external monitor timeouts
    const [redisResult, postgresResult] = await Promise.all([
        (async () => {
            try {
                const start = Date.now();
                await Promise.race([
                    redis.ping(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT))
                ]);
                const latencyMs = Date.now() - start;

                let memoryPercent = null;
                try {
                    const info = await Promise.race([
                        redis.info('memory'),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT))
                    ]);
                    const usedMatch = info.match(/used_memory:(\d+)/);
                    const maxMatch = info.match(/maxmemory:(\d+)/);
                    if (usedMatch && maxMatch && parseInt(maxMatch[1]) > 0) {
                        memoryPercent = parseFloat(((parseInt(usedMatch[1]) / parseInt(maxMatch[1])) * 100).toFixed(1));
                    }
                } catch (_) { /* memory info is best-effort */ }

                return { status: 'ok', memoryPercent, latencyMs };
            } catch (_) {
                return { status: 'unhealthy', error: 'connectivity check failed' };
            }
        })(),
        (async () => {
            try {
                const start = Date.now();
                const { sequelize } = require('../models');
                await Promise.race([
                    sequelize.query('SELECT 1'),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT))
                ]);
                return { status: 'ok', latencyMs: Date.now() - start };
            } catch (_) {
                return { status: 'unhealthy', error: 'connectivity check failed' };
            }
        })()
    ]);

    services.redis = redisResult;
    services.postgres = postgresResult;

    if (redisResult.status === 'unhealthy' || postgresResult.status === 'unhealthy') {
        overallStatus = 'unhealthy';
    }

    // API self-check (if we got here, the API is running)
    services.api = { status: 'ok' };

    if (overallStatus === 'healthy' && services.redis.memoryPercent !== null && services.redis.memoryPercent > 80) {
        overallStatus = 'degraded';
    }

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
        status: overallStatus,
        services,
        timestamp: new Date().toISOString()
    });
});

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
