/**
 * @fileoverview Bull Board middleware.
 * Basic auth protection for BullMQ dashboard at /bull endpoint.
 * @module middlewares/bullboard
 */

const auth = require('basic-auth');
const { getBullboardUsername, getBullboardPassword } = require('../lib/env');

module.exports = (req, res, next) => {
    const user = auth(req);

    if (user && user.name == getBullboardUsername() && user.pass == getBullboardPassword()) {
        next();
    }
    else {
        res.set({ 'WWW-Authenticate': 'Basic realm="bullBoard"' }).sendStatus(401);
    }
}
