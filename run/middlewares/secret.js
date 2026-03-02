/**
 * @fileoverview Secret middleware.
 * Validates internal API secret for protected endpoints.
 * @module middlewares/secret
 */

const logger = require('../lib/logger');
const { getSecret } = require('../lib/env');

module.exports = (req, res, next) => {
    try {
        if (req.query.secret == getSecret())
            next();
        else
            throw new Error('Invalid secret')
    } catch(error) {
        logger.error(error.message, { location: 'middleware.secret', error: error });
        res.status(401).send(error.message);
    }
}
