const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const db = require('../lib/firebase');
const logger = require('../lib/logger');
const router = express.Router();

router.get('/', workspaceAuthMiddleware, async (req, res, next) => {
    try {
        const workspace = data.workspace;

        if (!workspace.integrityCheckStartBlockNumber || !workspace.integrityCheck)
            throw new Error('Status is not available on this workspace');

        const result = {
            syncStatus: workspace.integrityCheck.status,
            latestCheckedBlock: workspace.integrityCheck.block.number,
            latestCheckedAt: workspace.integrityCheck.updatedAt    
            startingBlock: workspace.integrityCheckStartBlockNumber
        }

        res.send(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'api.status', error: error });
        res.status(400).send(error);
    }
});

module.exports = router;