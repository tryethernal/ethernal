const Sentry = require('@sentry/node');

const managedError = (error, req, res, status_code = 400) => {
    Sentry.setContext('params', { ...req.params, ...req.query });
    res.sentry = Sentry.captureException(error, {
        tags: {
            route: req.baseUrl + req.route.path,
            status_code
        }
    });
    return res.status(status_code).send(error.message);
};

const unmanagedError = (error, req, next) => {
    Sentry.setContext('params', { ...req.params, ...req.query });
    Sentry.setTags({
        route: req.baseUrl + req.route.path,
        status_code: 500
    });
    next(error);
};

const managedWorkerError = (error, jobName, jobData, worker) => {
    Sentry.setContext('Job Data', jobData);
    return Sentry.captureException(error, { tags: { job: jobName, worker }});
};

module.exports = { managedError, unmanagedError, managedWorkerError };