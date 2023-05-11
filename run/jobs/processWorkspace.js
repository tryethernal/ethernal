const { ProviderConnector } = require('../lib/rpc');
const { isMarketingEnabled } = require('../lib/flags');
const { withTimeout } = require('../lib/utils');
const db = require('../lib/firebase');

const NETWORK_ID_TIMEOUT = 10 * 1000;

module.exports = async job => {
    const data = job.data;
    if (!data.workspaceId)
        throw new Error('Missing parameter.');

    if (!isMarketingEnabled())
        return;

    const workspace = await db.getWorkspaceById(data.workspaceId);

    try {
        const provider = new ProviderConnector(workspace.rpcServer);
        const networkId = await withTimeout(provider.fetchNetworkId(), NETWORK_ID_TIMEOUT);
        await db.setWorkspaceRemoteFlag(workspace.id, networkId !== undefined && networkId !== null);
    } catch(_error) {
        await db.setWorkspaceRemoteFlag(workspace.id, false);
        return false;
    }
    return true;
};
