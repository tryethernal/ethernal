/*
    This sets up the middleware used for email/password auth
    The actually code is in strategies/local.js to make it easier to unit test
*/

const passport = require('passport');
const LocalStrategy = require('passport-local');

const strategy = require('./strategies/local');

const localStrategy = new LocalStrategy(
    { usernameField: 'email' },
    strategy
);

passport.use(localStrategy);

module.exports = (req, res, next) => {
    return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err || !user)
            return res.status(400).send('Invalid email or password.');

        req.user = user;

        next();        
    })(req, res, next);
};
