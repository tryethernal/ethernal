const db = require('../lib/firebase');
const { decrypt, decode } = require('../lib/crypto');
const logger = require('../lib/logger');

module.exports = async (req, res, next) => {
    let data;

    try {
        if (!req.query.token)
            throw new Error('Missing auth token');

        data = decode(req.query.token);

        if (!data.apiKey || !data.workspace || !data.uid)
            throw new Error('Invalid auth token');

        const user = await db.getUser(data.uid);

        if (!user || decrypt(user.apiKey) != data.apiKey)
            throw new Error('Invalid auth token');

        const workspace = await db.getWorkspaceByName(user.id, data.workspace);

        res.locals.uid = data.uid;
        res.locals.workspace = { rpcServer: workspace.rpcServer, name: workspace.name };
        res.locals.integrations = []
        if (workspace.alchemyIntegrationEnabled) res.locals.integrations.push('alchemy');
                
        next();
    } catch(error) {
        logger.error(error.message, { location: 'middleware.webhook', error: error, data: data });
        res.status(401).send(error);
    }
};
