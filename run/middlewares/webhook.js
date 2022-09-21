const db = require('../lib/firebase');
const { decrypt, decode } = require('../lib/crypto');

module.exports = async (req, res, next) => {
    try {
        if (!req.query.token)
            throw new Error('Missing auth token');

        const data = decode(req.query.token);

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
        console.log(req)
        console.error(error);
        res.status(401).send(error);
    }
};
