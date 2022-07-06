const { getAuth, connectAuthEmulator } = require('firebase-admin/auth');
const db = require('../lib/firebase');
const { sanitize }  = require('../lib/utils');

module.exports = async (req, res, next) => {
    let firebaseUser;
    const pusherData =  sanitize({ socket_id: req.body.socket_id, channel_name: req.body.channel_name, firebaseAuthToken: req.body.firebaseAuthToken, firebaseUserId: req.body.firebaseUserId, workspace: req.body.workspace });
    const data = { ...req.body.data, ...req.query, ...pusherData };

    try {
        if (!data.firebaseUserId || !data.workspace)
            return res.status(401).send('[workspaceAuth] Missing parameters');

        if (process.env.NODE_ENV !== 'production') {
            firebaseUser = { user_id: data.firebaseUserId };
        }
        else if (data.firebaseAuthToken) {
            firebaseUser = await getAuth().verifyIdToken(data.firebaseAuthToken);
        }

        const workspace = await db.getWorkspaceByName(data.firebaseUserId, data.workspace);

        if (!workspace)
            return res.sendStatus(400);

        if (workspace.public || (firebaseUser && data.firebaseUserId == firebaseUser.user_id)) {
            req.query.firebaseUserId = firebaseUser.user_id;
            req.query.workspace = workspace;
            next();
        }
        else
            res.sendStatus(404);
    } catch(error) {
        console.log(error);
        res.status(401).send(error);
    }
};