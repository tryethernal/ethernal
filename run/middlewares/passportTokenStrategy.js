const passport = require('passport');
const { getAuth } = require('firebase-admin/auth');
const CustomStrategy = require('passport-custom');
const db = require('../lib/firebase');
const { decode, decrypt } = require('../lib/crypto');

const strategy = new CustomStrategy(
    async (req, cb) => {
        const authorizationHeader = req.headers['authorization'];

        if (authorizationHeader) {
            const headerSplit = authorizationHeader.split('Bearer ');
            if (headerSplit.length > 1) {
                const jwtData = decode(headerSplit[1]);

                const user = await db.getUser(jwtData.firebaseUserId, ['apiKey']);

                if (!user)
                    return cb(null, false, { message: 'Invalid authorization header.' });

                if (decrypt(user.apiKey) !== jwtData.apiKey)
                    return cb(null, false, { message: 'Invalid authorization header.' });

                if (!user)
                    return cb(null, false, { message: 'Invalid authorization header.' });

                req.body.data = { ...req.body.data, uid: jwtData.firebaseUserId };

                return cb(null, user);
            }
            else
                return cb(null, false, { message: 'Invalid authorization header.' });
        }
        else if (req.query.firebaseAuthToken) {
            const firebaseUser = await getAuth().verifyIdToken(req.query.firebaseAuthToken);
            if (firebaseUser) {
                const user = await db.getUser(firebaseUser.user_id, ['apiKey']);
                req.body.data = { ...req.body.data, uid: firebaseUser.user_id };
                return cb(null, user);
            }
            return cb(null, false, { message: 'Invalid authentication token.' });
        }
        else
            return cb(null, false, { message: 'Invalid authorization header.' });
    }
);

passport.use('token', strategy);

module.exports = passport.authenticate('token', { session: false });
