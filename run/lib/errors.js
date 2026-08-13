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

// PostgreSQL error codes that describe data the database can never accept, no
// matter how many times we send it. Retrying these is pure waste: the job backs
// off exponentially, never reaches its final attempt within any useful horizon,
// and silently accumulates in the queue's delayed set where no alert looks.
//
// Deliberately excluded:
//   23505 unique_violation    - normal under concurrent inserts, retry is correct
//   23503 foreign_key_violation - can be transient while a parent row is committing
//   40001 / 40P01            - serialization failures and deadlocks, retry is correct
const PERMANENT_DATA_ERROR_CODES = [
    '22001', // string_data_right_truncation
    '22003', // numeric_value_out_of_range
    '22007', // invalid_datetime_format
    '22P02', // invalid_text_representation
    '23502', // not_null_violation
    '23514'  // check_violation
];

/**
 * Determines whether a database error is caused by data the schema can never
 * store, as opposed to a transient condition worth retrying.
 *
 * Sequelize nests the driver error under `parent`/`original`; we check both, and
 * the error itself for callers that pass a raw pg error.
 *
 * @param {Error} error - The error to classify
 * @returns {boolean} True if retrying the same payload cannot possibly succeed
 */
const isPermanentDataError = error => {
    if (!error)
        return false;

    const code = (error.parent && error.parent.code) || (error.original && error.original.code) || error.code;

    return PERMANENT_DATA_ERROR_CODES.includes(code);
};

/**
 * Builds an error that tells BullMQ to fail a job immediately, without burning
 * its remaining attempts.
 *
 * BullMQ recognises either its own `UnrecoverableError` class or any error
 * named `UnrecoverableError` (see `Job.moveToFailed`). We use the name because
 * `instanceof` is only reliable when every caller resolves the exact same copy
 * of the bullmq module, which nothing guarantees.
 *
 * @param {string} message - Why the job can never succeed
 * @returns {Error} An error BullMQ will move straight to the failed set
 */
const unrecoverableError = message => {
    const error = new Error(message);
    error.name = 'UnrecoverableError';
    return error;
};

module.exports = { managedError, unmanagedError, managedWorkerError, isPermanentDataError, unrecoverableError };
