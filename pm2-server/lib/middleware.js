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
