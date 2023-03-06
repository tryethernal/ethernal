const passport = require('passport');
const LocalStrategy = require('passport-local');
const { firebaseVerify } = require('../lib/crypto');
const db = require('../lib/firebase');

const strategy = new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, cb) => {
        const user = await db.getUserByEmail(email);

        if (!user)
            return cb(null, false, { message: 'Invalid email or password.' });

        const isPasswordValid = await firebaseVerify(password, user.passwordSalt, user.passwordHash);

        if (!isPasswordValid)
            return cb(null, false, { message: 'Invalid email or password.' });

        return cb(null, user);
    }
);

passport.use(strategy);

module.exports = (req, res, next) => {
    return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err || !user)
            return res.status(400).send('Invalid email or password.');

        req.user = user;
        next();
    })(req, res, next);
};
