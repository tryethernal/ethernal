/**
 * @fileoverview Sentry pipeline dashboard API endpoints.
 * Provides read access to pipeline run data for the dashboard UI.
 * @module api/sentryPipeline
 *
 * @route GET /runs - List paginated pipeline runs
 * @route GET /runs/:id - Get single run with conversation log
 * @route GET /stats - Get aggregated pipeline statistics
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const authMiddleware = require('../middlewares/auth');
const { unmanagedError } = require('../lib/errors');

router.get('/runs', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, itemsPerPage = 25, status } = req.query;
        const result = await db.getSentryPipelineRuns(
            parseInt(page),
            parseInt(itemsPerPage),
            status || undefined
        );
        res.status(200).json(result);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

router.get('/runs/:id', authMiddleware, async (req, res, next) => {
    try {
        const run = await db.getSentryPipelineRun(parseInt(req.params.id));
        if (!run)
            return res.status(404).json({ error: 'Run not found' });
        res.status(200).json(run);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

router.get('/stats', authMiddleware, async (req, res, next) => {
    try {
        const { period = '7d' } = req.query;
        const stats = await db.getSentryPipelineStats(period);
        res.status(200).json(stats);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
