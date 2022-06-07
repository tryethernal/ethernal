const { getAuth } = require('firebase-admin/auth');
const db = require('../lib/firebase');

module.exports = async (req, res, next) => {
    const data = { ...req.body.data, ...req.query };
    try {
        let firebaseUser;

        req.body.data = req.body.data || {};

        if (data.firebaseUserId && process.env.NODE_ENV !== 'production') {
            req.body.data.uid = data.firebaseUserId;
            next();
        }
        else if (data.firebaseAuthToken) {
            firebaseUser = await getAuth().verifyIdToken(data.firebaseAuthToken);

            if (!firebaseUser)
                throw new Error('You must be signed in to do this.');
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
        console.error(data)
        console.error(error);
        res.status(401).send(error);
    }
};
