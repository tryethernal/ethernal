/*
    This auth strategy checks 2 things:
    - If an authorization header is here, it will parse it as jwt
      (which should contain a firebase user id & an api token) and
      check that that the user matches the api token

    - If a Firebase auth token is present in the query parameters,
      it will verify the token and get the user from there
*/

const { getAuth } = require('firebase-admin/auth');
const db = require('../../lib/firebase');
const { decode, decrypt } = require('../../lib/crypto');

module.exports = async (req, cb) => {
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
};
