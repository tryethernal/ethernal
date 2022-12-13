const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');

module.exports = async job => {
    const data = job.data;

    if (!data.workspace)
        throw new Error('Missing parameter.');

    const workspace = await db.getWorkspaceByName(data.uid, data.workspace);

    try {
        const provider = new ProviderConnector(workspace.rpcServer);
        const networkId = await provider.fetchNetworkId();
        return await db.setWorkspaceRemoteFlag(data.uid, data.workspace, true);
    } catch(_error) {
        await db.setWorkspaceRemoteFlag(data.uid, data.workspace, false);
    }
};
