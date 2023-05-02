const ethers = require('ethers');
const moment = require('moment');
const db = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
let { getTokenTransfer } = require('./abi');
let { getProvider, ContractConnector, Tracer } = require('./rpc');

const _getFunctionSignatureForTransaction = (transaction, abi) => {
    try {
        if (!transaction || !abi)
            return null;

        var jsonInterface = new ethers.utils.Interface(abi);

        var parsedTransactionData = jsonInterface.parseTransaction(transaction);
        var fragment = parsedTransactionData.functionFragment;

        return `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
    } catch(error) {
        if (error.code == 'INVALID_ARGUMENT')
            return '';
    }
};

const getTxSynced = async (uid, workspace, transaction, receipt, timestamp) => {
    const sTransactionReceipt = receipt ? _stringifyBns(_sanitize(receipt)) : null;
    const sTransaction = _stringifyBns(_sanitize(transaction));

    let contractAbi = null;
    
    if (sTransactionReceipt && transaction.to && transaction.data != '0x') {
        const contractData = await db.getContractData(uid, workspace, transaction.to);
        contractAbi = contractData ? contractData.abi : null
    }

    return _sanitize({
       ...sTransaction,
        receipt: sTransactionReceipt,
        timestamp: timestamp,
        functionSignature: contractAbi ? _getFunctionSignatureForTransaction(transaction, contractAbi) : null
    });
};

const processTransactions = async (transactionIds) => {
    for (let i = 0; i < transactionIds.length; i++) {
        let contract;
        const transactionId = transactionIds[i];
        const transaction = await db.getTransactionForProcessing(transactionId);
        const userId = transaction.workspace.user.firebaseUserId;
        const workspaceName = transaction.workspace.name;

        if (transaction.to) {
            contract = await db.getContractData(userId, workspaceName, transaction.to);
        }
        else if (transaction.receipt) {
            const canSync = await db.canUserSyncContract(userId, workspaceName, transaction.receipt.contractAddress);
            if (canSync) {
                await db.storeContractData(userId, workspaceName, transaction.receipt.contractAddress, {
                    address: transaction.receipt.contractAddress,
                    timestamp: moment(transaction.timestamp).unix()
                });
            }
        }

        if (contract && contract.proxy)
            contract = await db.getContractData(userId, workspaceName, contract.proxy);

        const workspace = await db.getWorkspaceByName(userId, workspaceName);

        try {
            if (workspace && workspace.public && transaction.tokenTransfers) {
                const tokenTransfers = transaction.tokenTransfers;
                for (let i = 0; i < tokenTransfers.length; i++) {
                    const canSync = await db.canUserSyncContract(userId, workspaceName, tokenTransfers[i].token);
                    if (canSync)
                        await db.storeContractData(userId, workspaceName, tokenTransfers[i].token, { address: tokenTransfers[i].token });
                }
            }
        } catch(_error) {}

        if (workspace && workspace.public) {
            if (workspace.tracing == 'other') {
                try {
                    const tracer = new Tracer(workspace.rpcServer, db);
                    await tracer.process(transaction);
                    await tracer.saveTrace(userId, workspaceName);
                } catch(_error) {}
            }

            let errorObject;
            if (transaction.receipt && transaction.receipt.status == 0) {
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
                    await db.storeFailedTransactionError(userId, workspaceName, transaction.hash, errorObject);
            }
        }
    }
};

module.exports = {
    getFunctionSignatureForTransaction: _getFunctionSignatureForTransaction,
    getTxSynced: getTxSynced,
    processTransactions: processTransactions
}
