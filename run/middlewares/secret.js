/*
    This middleware check that the secret is present in the query
*/

const logger = require('../lib/logger');
module.exports = (req, res, next) => {
    try {
        if (req.query.secret == process.env.SECRET)
            next();
        else
            throw new Error('Invalid secret')
    } catch(error) {
        logger.error(error.message, { location: 'middleware.secret', error: error });
        res.status(401).send(error.message);
    }
}
