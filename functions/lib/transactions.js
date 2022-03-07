const ethers = require('ethers');
const { getContractData, storeTransactionMethodDetails, storeTransactionTokenTransfers } = require('./firebase');
const { getFunctionSignatureForTransaction } = require('./utils');
const { getTokenTransfers, getTransactionMethodDetails } = require('./abi');

exports.processTransactions = async (userId, workspace, transactions) => {
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        if (!transaction.to) continue;

        let contract = await getContractData(userId, workspace, transaction.to);

        if (!contract || !contract.abi) continue;

        if (contract.proxy)
            contract = await getContractData(userId, workspace, contract.proxy);

        try {
            const transactionMethodDetails = getTransactionMethodDetails(transaction, contract.abi);
            await storeTransactionMethodDetails(userId, workspace, transaction.hash, transactionMethodDetails);
        } catch(error) {
            console.log(error)
            await storeTransactionMethodDetails(userId, workspace, transaction.hash, null);
            continue
        }

        try {
            const tokenTransfers = getTokenTransfers(transaction, contract.abi);
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, tokenTransfers);
        } catch(error) {
            console.log(error)
            await storeTransactionTokenTransfers(userId, workspace, transaction.hash, []);
            continue;
        }
    }
};
