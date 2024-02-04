/*
    This middleware checks that Stripe is enabled.
    If not, a 404 is sent
*/


const logger = require('../lib/logger');
const { isStripeEnabled } = require('../lib/flags');

module.exports = async (req, res, next) => {
    try {
        if (isStripeEnabled())
            next();
        else
            res.sendStatus(404);
    } catch(error) {
        logger.error(error.message, { location: 'middleware.stripe', error: error });
        res.status(401).send(error);
    }
};
