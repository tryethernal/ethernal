/**
 * @fileoverview Browser sync middleware.
 * Prevents conflicts between browser sync and external sync sources.
 * @module middlewares/browserSync
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
