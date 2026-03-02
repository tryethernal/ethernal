/**
 * @fileoverview Centralized error handling utilities for API routes and workers.
 * Integrates with Sentry for error tracking and logging.
 * @module lib/errors
 */

const Sentry = require('@sentry/node');
const logger = require('./logger');

/**
 * Handles expected/managed errors in API routes.
 * Logs the error and sends a response with the error message.
 * @param {Error} error - The error that occurred
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} [status_code=400] - HTTP status code to return
 * @param {boolean} [capture=true] - Whether to capture in Sentry (unused)
 * @returns {Object} Express response with error message
 */
const managedError = (error, req, res, status_code = 400, capture = true) => {
    logger.error(error.message, error, { ...req.params, ...req.query });

    return res.status(status_code).send(error.message);
};

/**
 * Handles unexpected/unmanaged errors in API routes.
 * Logs the error, sets Sentry context, and passes to Express error handler.
 * @param {Error} error - The unexpected error
 * @param {Object} req - Express request object
 * @param {Function} next - Express next middleware function
 */
const unmanagedError = (error, req, next) => {
    logger.error(error.message, error, { ...req.params, ...req.query });

    Sentry.setContext('params', { ...req.params, ...req.query });
    Sentry.setTags({
        route: req.baseUrl + req.route.path,
        status_code: 500
    });

    next(error);
};

/**
 * Handles errors in background job workers.
 * Logs the error and captures it in Sentry with job context.
 * @param {Error} error - The error that occurred
 * @param {string} jobName - Name of the failed job
 * @param {Object} jobData - Data payload of the failed job
 * @param {string} worker - Name of the worker that encountered the error
 * @returns {string} Sentry event ID
 */
const managedWorkerError = (error, jobName, jobData, worker) => {
    logger.error(error.message, error, { jobName, worker, jobData });
    Sentry.setContext('Job Data', jobData);
    return Sentry.captureException(error, { tags: { job: jobName, worker }});
};

module.exports = { managedError, unmanagedError, managedWorkerError };
