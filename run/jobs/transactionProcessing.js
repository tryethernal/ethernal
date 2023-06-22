const ethers = require('ethers');
const logger = require('../lib/logger');
const db = require('../lib/firebase');
let { getProvider, Tracer } = require('../lib/rpc');
const moment = require('moment');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transactionId = data.transactionId;
    const transaction = await db.getTransactionForProcessing(transactionId);

    if (!transaction)
        return 'Cannot find transaction'

    const user = transaction.workspace.user;
    const workspace = transaction.workspace;

    // if (!transaction.to && transaction.receipt) {
    //     const canSync = await db.canUserSyncContract(user.firebaseUserId, workspace.name, transaction.receipt.contractAddress);
    //     if (canSync) {
    //         await db.storeContractData(user.firebaseUserId, workspace.name, transaction.receipt.contractAddress, {
    //             address: transaction.receipt.contractAddress,
    //             timestamp: moment(transaction.timestamp).unix()
    //         });
    //     }
    // }

    if (!workspace.public)
        return 'End of processing for local workspace';

    // if (transaction.tokenTransfers && transaction.tokenTransfers.length > 0) {
    //     try {
    //         const tokenTransfers = transaction.tokenTransfers;
    //         for (let i = 0; i < tokenTransfers.length; i++) {
    //             const canSync = await db.canUserSyncContract(user.firebaseUserId, workspace.name, tokenTransfers[i].token);
    //             if (canSync)
    //                 await db.storeContractData(user.firebaseUserId, workspace.name, tokenTransfers[i].token, { address: tokenTransfers[i].token });
    //         }
    //     } catch(_error) {
    //         logger.error(_error.message, { location: 'jobs.transactionProcessing.tokenTransfers', error: _error, transactionId });
    //     }
    // }

    // if (workspace.tracing == 'other') {
    //     try {
    //         const tracer = new Tracer(workspace.rpcServer, db);
    //         await tracer.process(transaction);
    //         await tracer.saveTrace(user.firebaseUserId, workspace.name);
    //     } catch(_error) {
    //         console.log(_error)
    //         logger.error(_error.message, { location: 'jobs.transactionProcessing.tracing', error: _error, transactionId });
    //     }
    // }

    if (transaction.receipt && transaction.receipt.status == 0 && !transaction.parsedError && !transaction.rawError) {
        let errorObject;
        try {
            const provider = getProvider(workspace.rpcServer);
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
            await db.storeFailedTransactionError(user.firebaseUserId, workspace.name, transaction.hash, errorObject);
    }

    return true;
};
