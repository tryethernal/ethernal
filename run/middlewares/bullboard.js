/*
    This middleware sets up a basic auth mechanism to access the BullMQ UI at /bull
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
