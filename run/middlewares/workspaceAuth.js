const { getAuth, connectAuthEmulator } = require('firebase-admin/auth');
const db = require('../lib/firebase');

module.exports = async (req, res, next) => {
    try {
        let firebaseUser;
        const data = req.query;

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