/*
    This middleware checks if the instance is self-hosted
*/

const logger = require('../lib/logger');
const { isSelfHosted } = require('../lib/flags');

module.exports = (req, res, next) => {
    try {
        if (isSelfHosted())
            next();
        else
            throw new Error('This feature is only available on self-hosted instances');
    } catch(error) {
        logger.error(error.message, { location: 'middleware.selfHosted', error: error });
        res.status(401).send(error.message);
    }
}
