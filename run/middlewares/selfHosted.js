/**
 * @fileoverview Self-hosted middleware.
 * Gates routes that are only available on self-hosted instances.
 * @module middlewares/selfHosted
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
