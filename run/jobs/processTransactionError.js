const ethers = require('ethers');
const db = require('../lib/firebase');
let { getProvider } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await db.getTransactionForProcessing(data.transactionId);

    if (!transaction)
        return 'Cannot find transaction';

    if (!transaction.workspace.public)
        return 'Not allowed on private workspaces';

    let errorObject;
    try {
        const provider = getProvider(transaction.workspace.rpcServer);
        const res = await provider.call({ to: transaction.to, data: transaction.data }, transaction.blockNumber);
        const reason = ethers.utils.toUtf8String('0x' + res.substr(138));
        errorObject = { parsed: true, message: reason };
    } catch(error) {
        if (error.response) {
            const parsed = JSON.parse(error.response);
            if (parsed.error && parsed.error.message)
                errorObject = { parsed: true, message: parsed.error.message };
            else
                errorObject = { parsed: false, message: parsed };
        }
        else
            errorObject = { parsed: false, message: JSON.stringify(error) };
    }

    if (errorObject)
        await db.storeFailedTransactionError(transaction.workspace.user.firebaseUserId, transaction.workspace.name, transaction.hash, errorObject);

    return true;
};
