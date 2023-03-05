const passport = require('passport');
const LocalStrategy = require('passport-local');
const { FirebaseScrypt } = require('firebase-scrypt');
const db = require('../lib/firebase');

const firebaseParameters = {
    algorithm: 'SCRYPT',
    signerKey: '7i3cf/CI8fTHydv0ckbA9SInLkTg/16EAr9vwaNqrVHLMTImrS301cH3CUENtp4W9tjIO1YpCW8eqwHHWtgYSQ==',
    saltSeparator: 'Bw==',
    rounds: 8,
    memCost: 14,
};

const strategy = new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, cb) => {
        const user = await db.getUserByEmail(email);

        if (!user)
            return cb(null, false, { message: 'Invalid email or password.' });

        const scrypt = new FirebaseScrypt(firebaseParameters);
        const isPasswordValid = await scrypt.hash(password, user.passwordSalt);

        if (!isPasswordValid)
            return cb(null, false, { message: 'Invalid email or password.' });

        return cb(null, user);
    }
);

passport.use(strategy);

module.exports = passport.authenticate('local', { session: false });
