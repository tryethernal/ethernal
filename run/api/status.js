/**
 * @fileoverview Status page API endpoints.
 * Provides health status for workspace sync and RPC connectivity.
 * @module api/status
 *
 * @route GET / - Get workspace sync and RPC health status
 */

const express = require('express');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const { sanitize, withTimeout } = require('../lib/utils');
const router = express.Router();
const { managedError, unmanagedError } = require('../lib/errors');
const redis = require('../lib/redis');

/**
 * @route GET /health - Public infrastructure health endpoint
 * Returns service statuses for external monitoring (UptimeRobot, OpsGenie heartbeat).
 * No auth required. Returns 200 if all ok, 503 if any service is unhealthy.
 */
const HEALTH_CHECK_TIMEOUT = 5000;

async function checkRedisHealth() {
    try {
        const start = Date.now();
        await withTimeout(redis.ping(), HEALTH_CHECK_TIMEOUT);
        const latencyMs = Date.now() - start;

        let memoryPercent = null;
        try {
            const info = await withTimeout(redis.info('memory'), HEALTH_CHECK_TIMEOUT);
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
}

async function checkPostgresHealth() {
    try {
        const start = Date.now();
        const { sequelize } = require('../models');
        await withTimeout(sequelize.query('SELECT 1'), HEALTH_CHECK_TIMEOUT);
        return { status: 'ok', latencyMs: Date.now() - start };
    } catch (_) {
        return { status: 'unhealthy', error: 'connectivity check failed' };
    }
}

router.get('/health', async (req, res) => {
    const [redisResult, postgresResult] = await Promise.all([
        checkRedisHealth(),
        checkPostgresHealth()
    ]);

    const services = {
        redis: redisResult,
        postgres: postgresResult,
        api: { status: 'ok' }
    };

    let overallStatus = 'healthy';
    if (redisResult.status === 'unhealthy' || postgresResult.status === 'unhealthy') {
        overallStatus = 'unhealthy';
    } else if (services.redis.memoryPercent !== null && services.redis.memoryPercent > 80) {
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
