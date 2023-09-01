const { getAuth } = require('firebase-admin/auth');
const db = require('../lib/firebase');
const { sanitize }  = require('../lib/utils');
const { decode, decrypt } = require('../lib/crypto');
const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    if (req.user) next();

    const pusherData =  sanitize({ socket_id: req.body.socket_id, channel_name: req.body.channel_name, firebaseAuthToken: req.body.firebaseAuthToken, firebaseUserId: req.body.firebaseUserId });
    const authorizationHeader = req.headers['authorization'];
    const data = { ...req.body.data, ...req.query, ...pusherData };

    try {
        let firebaseUser;

        req.body.data = req.body.data || {};

        if (authorizationHeader) {
            const headerSplit = authorizationHeader.split('Bearer ');
            if (headerSplit.length > 1) {
                const jwtData = decode(headerSplit[1]);

                const user = await db.getUser(jwtData.firebaseUserId, ['apiKey', 'stripeCustomerId']);

                if (!user)
                    throw new Error(`Invalid firebaseUserId`);

                if (decrypt(user.apiKey) !== jwtData.apiKey)
                    throw new Error(`Invalid authorization header`);

                if (!user)
                    throw new Error(`Invalid authorization header`);

                req.body.data.user = user;
                req.body.data.uid = jwtData.firebaseUserId;
                req.query.firebaseUserId = jwtData.firebaseUserId;
                next();
            }
            else
                throw new Error(`Invalid authorization header`);
        }
        else if (data.firebaseAuthToken) {
            firebaseUser = await getAuth().verifyIdToken(data.firebaseAuthToken);

            if (!firebaseUser)
                throw new Error('You must be signed in to do this.');
            req.body.data.user = await db.getUser(firebaseUser.user_id, ['apiKey', 'stripeCustomerId']);
            req.body.data.uid = firebaseUser.user_id;
            next();
        }
        else if (data.uid && data.secret === process.env.AUTH_SECRET) {
            delete req.body.data.secret;
            next();
        }
        else
            throw new Error('You must be signed in to do this.');
    } catch(error) {
        logger.error(error.message, { location: 'middleware.auth', error: error, data: data });
        res.status(401).send(error.message);
    }
};
