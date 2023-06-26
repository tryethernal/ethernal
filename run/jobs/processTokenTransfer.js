const db = require('../lib/firebase');
const { getBalanceChange } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.tokenTransferId)
        return 'Missing parameter.';

    const tokenTransfer = await db.getTokenTransferForProcessing(data.tokenTransferId);

    if (!tokenTransfer)
        return 'Cannot find token transfer';

    const workspace = tokenTransfer.workspace;
    const user = tokenTransfer.workspace.user;
    const transaction = tokenTransfer.transaction;

    if (!workspace.public)
        return 'Not processing private workspaces';

    const changes = [];

    if (tokenTransfer.src != '0x0000000000000000000000000000000000000000') {
        const balanceChange = await getBalanceChange(tokenTransfer.src, tokenTransfer.token, transaction.blockNumber, workspace.rpcServer);
        if (balanceChange && balanceChange.diff != '0')
            changes.push(balanceChange);
    }

    if (tokenTransfer.dst != '0x0000000000000000000000000000000000000000') {
        const balanceChange = await getBalanceChange(tokenTransfer.dst, tokenTransfer.token, transaction.blockNumber, workspace.rpcServer);
        if (balanceChange && balanceChange.diff != '0')
            changes.push(balanceChange);
    }

    if (changes.length > 0)
        await db.storeTokenBalanceChanges(user.firebaseUserId, workspace.name, tokenTransfer.id, changes);

    return true;
};
