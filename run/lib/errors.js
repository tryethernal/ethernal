const Sentry = require('@sentry/node');
const logger = require('./logger');

const managedError = (error, req, res, status_code = 400, capture = true) => {
    logger.error(error.message, error, { ...req.params, ...req.query });

    if (capture && !error.message.startsWith('Timed out after')) {
        Sentry.setContext('params', { ...req.params, ...req.query });
        res.sentry = Sentry.captureException(error, {
            tags: {
                route: req.baseUrl + req.route.path,
                status_code
            }
        });
    }
    return res.status(status_code).send(error.message);
};

const unmanagedError = (error, req, next) => {
    logger.error(error.message, error, { ...req.params, ...req.query });

    Sentry.setContext('params', { ...req.params, ...req.query });
    Sentry.setTags({
        route: req.baseUrl + req.route.path,
        status_code: 500
    });
    next(error);
};

const managedWorkerError = (error, jobName, jobData, worker) => {
    logger.error(error.message, error, { jobName, worker, jobData });
    Sentry.setContext('Job Data', jobData);
    return Sentry.captureException(error, { tags: { job: jobName, worker }});
};

module.exports = { managedError, unmanagedError, managedWorkerError };
