/*
    This middleware tries to prevent conflicts between browser sync & external sync.
    It does 2 things:
    1. Throws an error if the browser tries to sync something on a workspace where browser sync has been explicitely disabled
    2. Disable browser sync if we receive a sync from something that is not the browser

    Not sure if it's a good idea to have a middleware updating the db but it's pretty convenient...
*/

const db = require('../lib/firebase');
const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    const data = req.body.data;

    try {
        const workspace = await db.getWorkspaceByName(data.uid, data.workspace)

        if (!workspace.browserSyncEnabled && req.query.browserSync) {
            throw new Error('Browser sync is not enabled.')
        }

        if (workspace.browserSyncEnabled && !req.query.browserSync) {
            await db.updateBrowserSync(workspace.id, false);
        }

        next();
    } catch(error) {
        logger.error(error.message, { location: 'middleware.browserSync', error: error, data: data });
        res.status(401).send(error.message);
    }
}
