/**
 * @fileoverview Express middleware for PM2 server.
 * Provides secret validation for protected endpoints.
 * @module pm2-server/lib/middleware
 */

const { getSecret } = require('./env.js');

const secretMiddleware = (req, res, next) => {
    if (req.query.secret == getSecret())
        next();
    else
        return res.status(401).send('Invalid secret');
};

module.exports = {
    secretMiddleware
};
