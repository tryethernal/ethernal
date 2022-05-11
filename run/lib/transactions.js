const ethers = require('ethers');
const db = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
let { getTokenTransfers, getTransactionMethodDetails } = require('./abi');
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

let getBalanceChange = async (address, token, blockNumber, rpcServer) => {
    let currentBalance = ethers.BigNumber.from('0');
    let previousBalance = ethers.BigNumber.from('0');
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ContractConnector(rpcServer, token, abi);

    try {
        const options = {
            from: null,
            blockTag: blockNumber
        };

        const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);
        if (ethers.BigNumber.isBigNumber(res[0]))
            currentBalance = res[0];
        else
            throw 'Not a big number result'
    } catch(error) {
        return null;
    }

    if (blockNumber > 1) {
        try {
            const options = {
                from: null,
                blockTag: Math.max(1, parseInt(blockNumber) - 1)
            };

            const res = await contract.callReadMethod('balanceOf(address)', { 0: address }, options);
            if (ethers.BigNumber.isBigNumber(res[0]))
                previousBalance = res[0];
            else
                throw 'Not a big number result'
        }  catch(error) {
            return null;
        }
    }

    return {
        address: address,
        currentBalance: currentBalance.toString(),
        previousBalance: previousBalance.toString(),
        diff: currentBalance.sub(previousBalance).toString()
    };
}

const processTransactions = async (userId, workspaceName, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        let contract, tokenTransfers;
        const transaction = transactions[i];

        if (transaction.to)
            contract = await db.getContractData(userId, workspaceName, transaction.to);

        if (contract && contract.proxy)
            contract = await db.getContractData(userId, workspaceName, contract.proxy);

        if (contract && contract.abi) {
            try {
                const transactionMethodDetails = getTransactionMethodDetails(transaction, contract.abi);
                await db.storeTransactionMethodDetails(userId, workspaceName, transaction.hash, transactionMethodDetails);
            } catch(error) {
                await db.storeTransactionMethodDetails(userId, workspaceName, transaction.hash, null);
            }
        }
        else
            await db.storeTransactionMethodDetails(userId, workspaceName, transaction.hash, null);

        const workspace = await db.getWorkspaceByName(userId, workspaceName);

        try {
            tokenTransfers = getTokenTransfers(transaction);
            await db.storeTransactionTokenTransfers(userId, workspaceName, transaction.hash, tokenTransfers);

            if (workspace && workspace.public) {
                for (let i = 0; i < tokenTransfers.length; i++) {
                    await db.storeContractData(userId, workspaceName, tokenTransfers[i].token, { address: tokenTransfers[i].token })
                }
            }
        } catch(error) {
            await db.storeTransactionTokenTransfers(userId, workspaceName, transaction.hash, []);
        }

        if (workspace && workspace.public) {
            // try {
            //     const tracer = new Tracer(workspace.rpcServer, db);
            //     await tracer.process(transaction);
            //     await tracer.saveTrace(userId, workspaceName);
            // } catch(_error) {}

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

        if (tokenTransfers && workspace && workspace.public) {
            const tokenBalanceChanges = {};
            for (let i = 0; i < tokenTransfers.length; i++) {
                const transfer = tokenTransfers[i];
                const changes = [];
                if (transfer.src != '0x0000000000000000000000000000000000000000') {
                    const balanceChange = await getBalanceChange(transfer.src, transfer.token, transaction.blockNumber, workspace.rpcServer);
                    if (balanceChange)
                        changes.push(balanceChange);
                }
                if (transfer.dst != '0x0000000000000000000000000000000000000000') {
                    const balanceChange = await getBalanceChange(transfer.dst, transfer.token, transaction.blockNumber, workspace.rpcServer);
                    if (balanceChange)
                        changes.push(balanceChange);
                }

                if (changes.length > 0)
                    tokenBalanceChanges[transfer.token] = changes;
            }

            if (Object.keys(tokenBalanceChanges).length)
                await db.storeTokenBalanceChanges(userId, workspace.name, transaction.hash, tokenBalanceChanges);
        }
    }
};

module.exports = {
    getFunctionSignatureForTransaction: _getFunctionSignatureForTransaction,
    getTxSynced: getTxSynced,
    processTransactions: processTransactions
}
