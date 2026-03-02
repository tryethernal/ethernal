/**
 * @fileoverview Passport local strategy middleware.
 * Handles email/password authentication via passport-local.
 * @module middlewares/passportLocalStrategy
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
