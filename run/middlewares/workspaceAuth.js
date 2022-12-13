const { getAuth, connectAuthEmulator } = require('firebase-admin/auth');
const db = require('../lib/firebase');
const { sanitize, getEnv }  = require('../lib/utils');
const { decrypt, decode, encode } = require('../lib/crypto');
const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    let firebaseUser = {};
    const pusherData =  sanitize({ socket_id: req.body.socket_id, channel_name: req.body.channel_name, firebaseAuthToken: req.body.firebaseAuthToken, firebaseUserId: req.body.firebaseUserId, workspace: req.body.workspace });
    const authorizationHeader = req.headers['authorization'];
    const data = { ...req.body.data, ...req.query, ...pusherData };

    try {
        if (!data.workspace)
            throw new Error('Missing parameter');

        if (authorizationHeader) {
            const headerSplit = authorizationHeader.split('Bearer ');
            if (headerSplit.length > 1) {
                const jwtToken = headerSplit[1];

                const jwtData = decode(jwtToken);

                const user = await db.getUser(jwtData.firebaseUserId, ['apiKey']);
                if (!user)
                    throw new Error(`Invalid firebaseUserId`);

                if (decrypt(user.apiKey) !== jwtData.apiKey)
                    throw new Error(`Invalid authorization header`);

                firebaseUser = { user_id: jwtData.firebaseUserId };
                data.firebaseUserId = jwtData.firebaseUserId;
            }
            else
                throw new Error(`Invalid authorization header`);
        }
        else if (data.firebaseAuthToken) {
            firebaseUser = await getAuth().verifyIdToken(data.firebaseAuthToken);
        }
        else if (getEnv() !== 'production') {
            firebaseUser = { user_id: data.firebaseUserId };
        }

        if (!data.firebaseUserId && !firebaseUser.user_id)
            throw new Error('Missing parameter');

        const workspace = await db.getWorkspaceByName(data.firebaseUserId || firebaseUser.user_id, data.workspace);

        if (!workspace)
            return res.sendStatus(404);

        // Exit if workspace isn't public and is requested by a different account
        if (!workspace.public && firebaseUser && data.firebaseUserId && data.firebaseUserId != firebaseUser.user_id)
            return res.sendStatus(404);

        // Continue if workspace is public or we are requesting a workspace that we own
        if (workspace.public || (firebaseUser && data.firebaseUserId && data.firebaseUserId == firebaseUser.user_id)) {
            req.query.firebaseUserId = data.firebaseUserId;
            req.query.workspace = workspace;
            next();
        }
        else
            res.sendStatus(404);
    } catch(error) {
        logger.error(error.message, { location: 'middleware.workspaceAuth', error: error, data: data });
        res.status(401).send(error.message);
    }
};