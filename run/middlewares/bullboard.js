/*
    This middleware sets up a basic auth mechanism to access the BullMQ UI at /bull
*/

const auth = require('basic-auth');

module.exports = (req, res, next) => {
    const user = auth(req);

    if (user && user.name == process.env.BULLBOARD_USERNAME && user.pass == process.env.BULLBOARD_PASSWORD) {
        next();
    }
    else {
        res.set({ 'WWW-Authenticate': 'Basic realm="bullBoard"' }).sendStatus(401);
    }
}
