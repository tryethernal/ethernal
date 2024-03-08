/*
    Checks that it has been sent by Quiknode backend & that
    Quiknode integration is enabled
*/

const logger = require('../lib/logger');
const { isQuicknodeEnabled } = require('../lib/flags');
const { getQuicknodeCredentials } = require('../lib/env');

module.exports = async (req, res, next) => {
    try {
        if (!isQuicknodeEnabled())
            return res.sendStatus(404);

        if (!req.headers.authorization || req.headers.authorization != `Basic ${getQuicknodeCredentials()}`)
            return res.sendStatus(401);    

        next();
    } catch(error) {
        logger.error(error.message, { location: 'middleware.quiknode', error: error });
        res.status(401).send(error);
    }
};
