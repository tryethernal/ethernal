const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    try {
        if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY)
            next();
        else
            res.sendStatus(404);
    } catch(error) {
        logger.error(error.message, { location: 'middleware.stripe', error: error, data: data });
        res.status(401).send(error);
    }
};
