const { ProviderConnector } = require('../lib/rpc');
const { isMarketingEnabled } = require('../lib/flags');
const db = require('../lib/firebase');

module.exports = async job => {
    const data = job.data;
    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    if (!isMarketingEnabled)
        return;

    const workspace = await db.getWorkspaceById(data.workspaceId);

    try {
        const provider = new ProviderConnector(workspace.rpcServer);
        const networkId = await provider.fetchNetworkId();
        await db.setWorkspaceRemoteFlag(workspace.id, true);
    } catch(_error) {
        await db.setWorkspaceRemoteFlag(workspace.id, false);
        return false;
    }
    return true;
};
