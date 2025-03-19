const ethers = require('ethers');
const db = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const { getProvider } = require('../lib/rpc');
const { log } = require('winston');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await db.getTransactionForProcessing(data.transactionId);

    if (!transaction)
        return 'Cannot find transaction';

    if (!transaction.receipt)
        return 'Cannot find receipt';

    if (!transaction.workspace.public)
        return 'Not allowed on private workspaces';

    if (!transaction.workspace.explorer)
        return 'Inactive explorer';

    // if (!transaction.workspace.explorer.shouldSync)
    //     return 'Sync is disabled';

    if (transaction.workspace.rpcHealthCheckEnabled && transaction.workspace.rpcHealthCheck && !transaction.workspace.rpcHealthCheck.isReachable)
        return 'RPC is not reachable';

    if (!transaction.workspace.explorer.stripeSubscription)
        return 'No active subscription';

    if (transaction.receipt.status != 0)
        return 'No error to process';

    let errorObject;
    try {
        const provider = getProvider(transaction.workspace.rpcServer);
        const res = await provider.call({ to: transaction.to, data: transaction.data, value: transaction.value }, transaction.blockNumber);
        let reason;
        if (transaction.contract && transaction.contract.abi) {
            const iface = new ethers.utils.Interface(transaction.contract.abi);
            reason = iface.decodeErrorResult(res.substring(0, 10), res);
        } else
            reason = ethers.utils.toUtf8String('0x' + res.substr(138));
        errorObject = { parsed: true, message: reason };
    } catch(error) {
        const parsedError = JSON.parse(JSON.stringify(error));
        if (parsedError.error && parsedError.error.body) {
            const parsedBody = JSON.parse(parsedError.error.body);
            if (parsedBody.error && parsedBody.error.message)
                errorObject = { parsed: true, message: parsedBody.error.message };
            else
                errorObject = { parsed: false, message: parsedBody };
        }
        else if (error.response) {
            const parsed = JSON.parse(error.response);
            if (parsed.error && parsed.error.message)
                errorObject = { parsed: true, message: parsed.error.message };
            else
                errorObject = { parsed: false, message: parsed };
        }
        else if (error.reason) {
            let message = error.reason;
            const extra = sanitize({ code: error.code, argument: error.argument, value: error.value }, false);
            if (Object.keys(extra).length)
                message += ` - ${JSON.stringify(extra)}`;
            errorObject = { parsed: true, message };
        } else
            errorObject = { parsed: false, message: JSON.stringify(error) };
    }

    if (errorObject)
        await db.storeFailedTransactionError(transaction.workspace.user.firebaseUserId, transaction.workspace.name, transaction.hash, errorObject);

    return true;
};
