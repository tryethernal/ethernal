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

module.exports = { managedError, unmanagedError };
