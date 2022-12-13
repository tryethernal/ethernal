const { getAuth } = require('firebase-admin/auth');
const db = require('../lib/firebase');
const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };
    try {
        if (data.secret === process.env.AUTH_SECRET)
            next();
        else
            res.sendStatus(401);
    } catch(error) {
        logger.error(error.message, { location: 'middleware.task', error: error, data: data });
        res.status(401).send(error);
    }
};
